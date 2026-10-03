import { describe, expect, it } from "vitest";
import { LoginCode, LoginEmail, safeNextPath } from "./validation";

describe("safeNextPath", () => {
  it("keeps paths inside the app", () => {
    expect(safeNextPath("/admin")).toBe("/admin");
    expect(safeNextPath("/my/creator?step=3")).toBe("/my/creator?step=3");
  });

  it("falls back for missing values", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("", "/login")).toBe("/login");
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
    expect(safeNextPath("/ok\nSet-Cookie: x")).toBe("/");
  });
});

describe("LoginEmail", () => {
  it("normalizes case and whitespace", () => {
    expect(LoginEmail.parse("  Anna@Example.ORG ")).toBe("anna@example.org");
  });

  it("rejects an invalid address with a Polish message", () => {
    const result = LoginEmail.safeParse("anna@");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/adres e-mail/);
  });
});

describe("LoginCode", () => {
  it("accepts exactly six digits", () => {
    expect(LoginCode.parse(" 482913 ")).toBe("482913");
    expect(LoginCode.safeParse("48291").success).toBe(false);
    expect(LoginCode.safeParse("4829134").success).toBe(false);
    expect(LoginCode.safeParse("48a913").success).toBe(false);
  });
});
