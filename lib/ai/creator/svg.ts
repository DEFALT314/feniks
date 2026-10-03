// Whitelist sanitizer for the SVG illustration drawn by the language model (/api/ai/image).
// The image is shown in <img>, where scripts never run; this is defense in depth: only drawing
// elements and presentation attributes survive, with no links, scripts, styles or external URLs.

const ELEMENTS = new Set([
  "svg",
  "g",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "path",
  "text",
  "tspan",
  "title",
  "desc",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
]);
// Content of these is dropped entirely.
const DROP_WITH_CONTENT =
  /<(script|style|foreignObject|iframe|object|embed|image|use|a)\b[\s\S]*?(<\/\1\s*>|\/>)/gi;
const ATTRIBUTES = new Set([
  "x",
  "y",
  "width",
  "height",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "d",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "transform",
  "viewbox",
  "xmlns",
  "font-size",
  "font-family",
  "font-weight",
  "text-anchor",
  "dominant-baseline",
  "offset",
  "stop-color",
  "stop-opacity",
  "id",
  "gradientunits",
  "role",
  "aria-label",
  "preserveaspectratio",
]);
const MAX_LENGTH = 30_000;

function cleanAttributes(raw: string): string {
  const kept: string[] = [];
  for (const m of raw.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    const name = m[1].toLowerCase();
    const value = m[3] ?? m[4] ?? "";
    if (!ATTRIBUTES.has(name)) continue;
    // Only internal references like url(#grad) are allowed; no javascript:, data: or external URLs.
    if (/javascript:|data:|https?:|url\((?!\s*#)/i.test(value)) continue;
    kept.push(`${m[1]}="${value.replace(/"/g, "&quot;")}"`);
  }
  return kept.length ? " " + kept.join(" ") : "";
}

// Returns a safe SVG string, or null when the input is not a usable SVG.
export function sanitizeSvg(input: string): string | null {
  const start = input.search(/<svg\b/i);
  const end = input.toLowerCase().lastIndexOf("</svg>");
  if (start < 0 || end < start) return null;
  const svg = input
    .slice(start, end + 6)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(DROP_WITH_CONTENT, "");
  if (svg.length > MAX_LENGTH) return null;

  const out = svg.replace(
    /<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g,
    (_, close, tag, attrs, self) => {
      const name = tag.toLowerCase();
      if (!ELEMENTS.has(name)) return "";
      return close ? `</${tag}>` : `<${tag}${cleanAttributes(attrs)}${self ? "/" : ""}>`;
    },
  );
  // Text between tags must not contain markup-breaking characters left by removed tags.
  if (/<(?!\/?[a-zA-Z])/.test(out)) return null;
  return /^<svg\b[^>]*xmlns=/i.test(out)
    ? out
    : out.replace(/^<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
