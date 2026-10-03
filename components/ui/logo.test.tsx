import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Logo, LogoMark } from "./logo";

describe("Logo", () => {
  it("hides the mark from screen readers and shows the name and tagline", () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("HubMI");
    expect(html).toContain("innowacje społeczne Małopolski");
  });

  it("uses the brand colors for each background", () => {
    const light = renderToStaticMarkup(<LogoMark />);
    const dark = renderToStaticMarkup(<LogoMark variant="dark" />);
    expect(light).toContain('fill="#1F3A8A"');
    expect(light).toContain('fill="#C2452B"');
    expect(dark).toContain('fill="#FFFFFF"');
    expect(dark).toContain('fill="#FF9B85"');
  });
});
