import { describe, expect, it } from "vitest";
import aiFixture from "./fixtures/ai.json";
import matchFixture from "./fixtures/match.json";
import middlemanFixture from "./fixtures/middleman.json";
import * as A from "./ai";
import * as M from "./match";
import * as MM from "./middleman";

describe("P3 contracts: fixtures pass validation", () => {
  it.each([
    ["match request", M.MatchRequest, matchFixture.request],
    ["match response", M.MatchResponse, matchFixture.response],
    ["match response without a match", M.MatchResponse, matchFixture.response_no_match],
    ["hint request", A.HintRequest, aiFixture.hint_request],
    ["hint response", A.HintResponse, aiFixture.hint_response],
    ["application request", A.ApplicationRequest, aiFixture.application_request],
    ["application response", A.ApplicationResponse, aiFixture.application_response],
    ["image request", A.ImageRequest, aiFixture.image_request],
    ["image response", A.ImageResponse, aiFixture.image_response],
    ["service card request", MM.ServiceCardRequest, middlemanFixture.request],
    ["service card", MM.ServiceCard, middlemanFixture.card],
  ] as const)("%s", (_, schema, data) => {
    expect(schema.safeParse(data).success).toBe(true);
  });
});

describe("match contract", () => {
  it("rejects descriptions that are too short or too long", () => {
    expect(M.MatchRequest.safeParse({ description: "pomoc" }).success).toBe(false);
    expect(M.MatchRequest.safeParse({ description: "a".repeat(2001) }).success).toBe(false);
  });

  it("ai is optional and boolean", () => {
    expect(M.MatchRequest.safeParse({ ...matchFixture.request, ai: false }).success).toBe(true);
    expect(M.MatchRequest.safeParse({ ...matchFixture.request, ai: "nie" }).success).toBe(false);
  });

  it("allows at most three recommended innovations", () => {
    const four = Array(4).fill(matchFixture.response.innovations[0]);
    expect(M.MatchResponse.safeParse({ ...matchFixture.response, innovations: four }).success).toBe(
      false,
    );
  });

  it("description segments rebuild the shown description", () => {
    const text = matchFixture.response.description_segments.map((s) => s.text).join("");
    expect(text).toBe(matchFixture.request.description);
  });

  it("every quote is a verbatim fragment of the innovation's description", () => {
    for (const m of M.matchFixtures.response.innovations) {
      expect(m.innovation.opis_krotki).toContain(m.quote);
    }
  });
});

describe("AI contracts", () => {
  it("rejects an unknown idea field", () => {
    expect(A.HintRequest.safeParse({ ...aiFixture.hint_request, fields: ["budget"] }).success).toBe(
      false,
    );
  });

  it("marks application sections with placeholders as needing user input", () => {
    for (const s of A.aiFixtures.applicationResponse.sections) {
      expect(s.needs_user_input).toBe(s.text.includes("["));
    }
  });
});

describe("middleman contract", () => {
  it("AI leaves the cost estimate empty for the institution", () => {
    expect(MM.middlemanFixtures.card.cost.estimate).toBeNull();
  });

  it("rejects an unknown institution type", () => {
    const institution = { ...middlemanFixture.request.institution, type: "szkola" };
    expect(
      MM.ServiceCardRequest.safeParse({ ...middlemanFixture.request, institution }).success,
    ).toBe(false);
  });
});
