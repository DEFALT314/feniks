import { describe, expect, it, vi } from "vitest";
import fixture from "@/lib/contracts/fixtures/match.json";
import type { MatchResponse } from "@/lib/contracts/match";

const postJson = vi.fn();
vi.mock("../_lib/api", () => ({ postJson: (...args: unknown[]) => postJson(...args) }));

const { findSimilar } = await import("./similar-innovation");
const response = fixture.response as MatchResponse;

describe("findSimilar", () => {
  it("shows the best innovation of a strong match", async () => {
    postJson.mockResolvedValue({ ok: true, data: { ...response, match_quality: "strong" } });
    await expect(findSimilar("Seniorzy po szpitalu")).resolves.toMatchObject({
      status: "found",
      innovation: { id: response.innovations[0].innovation.id },
    });
  });

  it("does not call a weak match 'something similar'", async () => {
    postJson.mockResolvedValue({ ok: true, data: { ...response, match_quality: "weak" } });
    await expect(findSimilar("Kawiarenka cyfrowa w bibliotece")).resolves.toEqual({
      status: "none",
    });
  });
});
