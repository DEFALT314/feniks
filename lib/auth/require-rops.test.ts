import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-pathname": "/admin/trends" }),
}));
vi.mock("@/lib/supabase/proxy", () => ({ PATHNAME_HEADER: "x-pathname" }));
vi.mock(".", async () => {
  const roles = await import("./roles");
  return { adminAccess: roles.adminAccess, getCurrentUser: () => getCurrentUser() };
});

const { requireRops } = await import("./require-rops");

describe("requireRops", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    redirect.mockClear();
  });

  it("returns ROPS staff", async () => {
    const user = { id: "r1", role: "rops_admin" };
    getCurrentUser.mockResolvedValue(user);
    await expect(requireRops()).resolves.toBe(user);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("stops other roles before the page renders anything", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1", role: "mieszkaniec" });
    await expect(requireRops()).rejects.toThrow("NEXT_REDIRECT /");
  });

  it("sends visitors to sign in and back to the page they asked for", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(requireRops()).rejects.toThrow(/NEXT_REDIRECT \/login\?next=%2Fadmin%2Ftrends/);
  });
});
