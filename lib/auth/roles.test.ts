import { describe, expect, it } from "vitest";
import { adminAccess, hasRole, isRopsRole } from "./roles";

describe("roles", () => {
  it("recognizes ROPS roles", () => {
    expect(isRopsRole("rops_admin")).toBe(true);
    expect(isRopsRole("rops_redaktor")).toBe(true);
    expect(isRopsRole("ekspert")).toBe(false);
    expect(isRopsRole(null)).toBe(false);
  });

  it("hasRole checks membership and handles anonymous users", () => {
    expect(hasRole({ role: "jst" }, ["jst", "ngo"])).toBe(true);
    expect(hasRole({ role: "mieszkaniec" }, ["jst", "ngo"])).toBe(false);
    expect(hasRole(null, ["mieszkaniec"])).toBe(false);
  });

  it("adminAccess sends anonymous users to sign in and blocks non-ROPS roles", () => {
    expect(adminAccess(null)).toBe("sign-in");
    expect(adminAccess({ role: "mieszkaniec" })).toBe("forbidden");
    expect(adminAccess({ role: "ekspert" })).toBe("forbidden");
    expect(adminAccess({ role: "rops_redaktor" })).toBe("allowed");
    expect(adminAccess({ role: "rops_admin" })).toBe("allowed");
  });
});
