import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageSkeleton } from "./skeleton";

describe("PageSkeleton", () => {
  it("tells screen readers the page is loading and keeps the skip-link target", () => {
    const html = renderToStaticMarkup(<PageSkeleton label="Wczytywanie testów…" />);
    expect(html).toMatch(/<main id="main-content"[^>]*aria-busy="true"/);
    expect(html).toContain('<p role="status" class="sr-only">Wczytywanie testów…</p>');
  });

  it("hides the placeholders from screen readers and stops pulsing with reduced motion", () => {
    const html = renderToStaticMarkup(<PageSkeleton label="Wczytywanie…" cards={3} />);
    const blocks = html.match(/<div aria-hidden="true" data-slot="skeleton"[^>]*>/g) ?? [];
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.every((b) => b.includes("motion-reduce:animate-none"))).toBe(true);
  });

  it("draws the tester layout with a side panel", () => {
    const grid = renderToStaticMarkup(<PageSkeleton label="x" cards={2} />);
    const split = renderToStaticMarkup(<PageSkeleton label="x" layout="split" cards={2} />);
    expect(grid).toContain("md:grid-cols-2");
    expect(split).toContain("max-w-[420px]");
  });
});
