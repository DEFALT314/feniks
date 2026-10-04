import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});
let pathname: string | null = "/admin";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", async () => {
  const roles = await import("@/lib/auth/roles");
  return { adminAccess: roles.adminAccess, getCurrentUser: () => getCurrentUser() };
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(pathname ? { "x-hubmi-pathname": pathname } : {}),
}));

const { default: AdminLayout } = await import("./layout");
const render = () => AdminLayout({ children: "panel" } as never);

describe("app/admin/layout", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    redirect.mockClear();
    pathname = "/admin";
  });

  it("sends a guest to /login and back to the panel page they asked for", async () => {
    getCurrentUser.mockResolvedValue(null);
    pathname = "/admin/trends";
    await expect(render()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login?next=%2Fadmin%2Ftrends");
  });

  it("falls back to the panel start when the pathname header is missing", async () => {
    getCurrentUser.mockResolvedValue(null);
    pathname = null;
    await expect(render()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login?next=%2Fadmin");
  });

  it("keeps other roles out of the panel", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", role: "mieszkaniec" });
    await expect(render()).rejects.toThrow("NEXT_REDIRECT /");
  });

  it("lets ROPS staff in", async () => {
    getCurrentUser.mockResolvedValue({ id: "u2", role: "rops_redaktor" });
    expect(await render()).toBe("panel");
  });
});
