import { describe, expect, it } from "vitest";
import { signInUrl } from "./sign-in-redirect";

describe("signInUrl", () => {
  it("returns to the requested page after signing in", () => {
    expect(signInUrl("/my/creator")).toBe("/login?next=%2Fmy%2Fcreator");
    expect(signInUrl("/my/creator/abc/card?step=2")).toBe(
      "/login?next=%2Fmy%2Fcreator%2Fabc%2Fcard%3Fstep%3D2",
    );
  });

  it("falls back to a plain /login for missing or unsafe paths", () => {
    expect(signInUrl(null)).toBe("/login");
    expect(signInUrl("/")).toBe("/login");
    expect(signInUrl("https://evil.example")).toBe("/login");
    expect(signInUrl("//evil.example")).toBe("/login");
  });
});
