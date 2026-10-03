import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/knowledge-base.json";
import * as K from "./knowledge-base";

describe("knowledge base contract: fixtures pass validation", () => {
  it.each([
    ["categories", K.Category.array(), fixtures.categories],
    ["innovation_list", K.InnovationList, fixtures.innovation_list],
    ["innovation", K.Innovation, fixtures.innovation],
    ["innovations", K.Innovation.array(), fixtures.innovations],
    ["challenge_areas", K.ChallengeArea.array(), fixtures.challenge_areas],
    ["challenge_area_details", K.ChallengeAreaDetails, fixtures.challenge_area_details],
    ["resources", K.Resource.array(), fixtures.resources],
    ["innovation_edit", K.InnovationEdit, fixtures.innovation_edit],
  ] as const)("%s", (_, schema, data) => {
    expect(schema.safeParse(data).success).toBe(true);
  });

  it("edit rejects unknown fields (e.g. id)", () => {
    expect(K.InnovationEdit.safeParse({ id: "inne-id" }).success).toBe(false);
  });
});
