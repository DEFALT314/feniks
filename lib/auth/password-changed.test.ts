import { describe, expect, it } from "vitest";
import { isPasswordChanged, PASSWORD_CHANGED_PATH } from "./password-changed";

describe("password change confirmation", () => {
  it("points to the profile, which reads the flag back", () => {
    const url = new URL(PASSWORD_CHANGED_PATH, "http://x");
    expect(url.pathname).toBe("/my/profile");
    expect(isPasswordChanged(Object.fromEntries(url.searchParams))).toBe(true);
  });

  it("is off for a plain visit or another value", () => {
    expect(isPasswordChanged({})).toBe(false);
    expect(isPasswordChanged({ password: "x" })).toBe(false);
    expect(isPasswordChanged({ password: ["changed", "changed"] })).toBe(false);
  });
});
