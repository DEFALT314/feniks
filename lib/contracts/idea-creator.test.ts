import { describe, expect, it } from "vitest";
import canvasData from "@/data/rops/canvas_innowacji.json";
import fixtures from "./fixtures/idea-creator.json";
import { Canvas, GoodPractice, IdeaCardInput, IdeaWithCanvas } from "./idea-creator";

describe("idea creator contract", () => {
  it("accepts the ROPS canvas data", () => {
    expect(Canvas.safeParse(canvasData).success).toBe(true);
  });

  it("accepts the sample idea", () => {
    expect(IdeaWithCanvas.safeParse(fixtures.idea).success).toBe(true);
  });

  it("rejects an empty title and an unknown stage", () => {
    expect(IdeaCardInput.safeParse({ tytul: "  " }).success).toBe(false);
    expect(IdeaCardInput.safeParse({ etap: "start" }).success).toBe(false);
  });

  it("accepts the sample good practices", () => {
    expect(fixtures.good_practices.length).toBeGreaterThan(0);
    for (const practice of fixtures.good_practices) {
      expect(GoodPractice.safeParse(practice).success).toBe(true);
    }
  });

  it("never carries the author or the canvas of a good practice", () => {
    const practice = GoodPractice.parse({
      ...fixtures.good_practices[0],
      autor_id: "3f6d2c1e-8b7a-4e5f-9c1d-2a3b4c5d6e7f",
      answers: {},
    });
    expect(practice).not.toHaveProperty("autor_id");
    expect(practice).not.toHaveProperty("answers");
  });

  it("accepts an average only on the 1–5 scale", () => {
    const practice = fixtures.good_practices[0];
    expect(GoodPractice.safeParse({ ...practice, srednia_ocena: 6 }).success).toBe(false);
    expect(GoodPractice.safeParse({ ...practice, srednia_ocena: null }).success).toBe(true);
  });
});
