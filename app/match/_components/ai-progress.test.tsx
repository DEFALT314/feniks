import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AI_STEPS, AiProgress, ResultSkeleton, progressPercent, stepAt } from "./ai-progress";

describe("AI progress", () => {
  it("moves through the steps every few seconds and stays on the last one", () => {
    expect(stepAt(0)).toBe(AI_STEPS[0]);
    expect(stepAt(4)).toBe(AI_STEPS[1]);
    expect(stepAt(120)).toBe(AI_STEPS.at(-1));
  });

  it("fills the bar gradually and never reaches the end before the answer", () => {
    expect(progressPercent(0)).toBe(0);
    expect(progressPercent(8)).toBeGreaterThan(50);
    expect(progressPercent(600)).toBeLessThanOrEqual(95);
  });

  it("announces one static message; the rotating step and counter are hidden from screen readers", () => {
    const html = renderToStaticMarkup(<AiProgress />);
    expect(html).toMatch(/<p role="status"[^>]*>AI wybiera najlepiej pasujące innowacje<\/p>/);
    expect(html).toMatch(/<p aria-hidden="true"[^>]*>Czytam Twój opis…<\/p>/);
    expect(html).toContain("motion-reduce:animate-none");
  });

  it("the search skeleton is hidden from screen readers", () => {
    expect(renderToStaticMarkup(<ResultSkeleton />)).toMatch(/^<div aria-hidden="true"/);
  });
});
