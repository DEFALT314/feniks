import { describe, expect, it } from "vitest";
import { LoginEmail, NewPassword, SignInInput, safeNextPath } from "./validation";

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

describe("NewPassword", () => {
  it("needs at least 10 characters", () => {
    expect(NewPassword.safeParse("krotkie").success).toBe(false);
    expect(NewPassword.parse("mój kot lubi mleko")).toBe("mój kot lubi mleko");
  });

  it("rejects passwords longer than 72 characters", () => {
    expect(NewPassword.safeParse("a".repeat(73)).success).toBe(false);
  });
});

describe("SignInInput", () => {
  it("asks for a password", () => {
    const result = SignInInput.safeParse({ email: "anna@example.org", password: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Wpisz hasło.");
  });
});
