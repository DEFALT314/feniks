import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});
let pathname: string | null = "/my/creator";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(pathname ? { "x-hubmi-pathname": pathname } : {}),
}));

const { default: MyAreaLayout } = await import("./layout");

describe("app/my/layout", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    redirect.mockClear();
    pathname = "/my/creator";
  });

  it("sends a guest to /login and back to the page they wanted", async () => {
    getCurrentUser.mockResolvedValue(null);
    pathname = "/my/creator/abc/card";
    await expect(MyAreaLayout({ children: "x" } as never)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login?next=%2Fmy%2Fcreator%2Fabc%2Fcard");
  });

  it("still redirects when the pathname header is missing", async () => {
    getCurrentUser.mockResolvedValue(null);
    pathname = null;
    await expect(MyAreaLayout({ children: "x" } as never)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login?next=%2Fmy%2Fcreator");
  });

  it("renders the page for a signed-in user", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", role: "mieszkaniec" });
    const result = await MyAreaLayout({ children: "page" } as never);
    expect(result).toBe("page");
    expect(redirect).not.toHaveBeenCalled();
  });
});
