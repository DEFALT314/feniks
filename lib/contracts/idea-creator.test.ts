import { describe, expect, it } from "vitest";
import canvasData from "@/data/rops/canvas_innowacji.json";
import fixtures from "./fixtures/idea-creator.json";
import { Canvas, IdeaCardInput, IdeaWithCanvas } from "./idea-creator";

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
});
