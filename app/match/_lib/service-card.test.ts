import { describe, expect, it } from "vitest";
import { offersServiceCard } from "./service-card";

describe("offersServiceCard", () => {
  it("offers the service card to institutions, ROPS and visitors", () => {
    for (const role of ["jst", "ngo", "rops_redaktor", "rops_admin", null] as const) {
      expect(offersServiceCard(role)).toBe(true);
    }
  });

  it("hides it from residents and experts, who have no institution", () => {
    expect(offersServiceCard("mieszkaniec")).toBe(false);
    expect(offersServiceCard("ekspert")).toBe(false);
  });
});
