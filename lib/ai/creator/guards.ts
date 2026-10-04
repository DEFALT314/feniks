// Safeguards for AI text in the idea creator (CLAUDE.md rule 5; issue #18: "AI never invents numbers
// or costs; empty fields stay for the user").

export const NUMBER_PLACEHOLDER = "[liczba do uzupełnienia]";

// Polish amounts group thousands with a (non-breaking) space: "15 000 zł" is one number.
const NUMBER = /(?:\d{1,3}(?:[ \u00a0]\d{3})+|\d+)(?:[.,]\d+)?(?:\s?%)?/g;

// "1. Rekrutacja…", "2) Spotkania…": a list marker at the start of a line or sentence is not a fact
const LIST_MARKER_BEFORE = /(?:^|[\n.:;!?])\s*$/;
const LIST_MARKER_AFTER = /^[.)]\s/;

function isListMarker(n: string, offset: number, text: string): boolean {
  if (!/^\d{1,2}$/.test(n)) return false;
  return (
    LIST_MARKER_BEFORE.test(text.slice(Math.max(0, offset - 8), offset)) &&
    LIST_MARKER_AFTER.test(text.slice(offset + n.length, offset + n.length + 2))
  );
}

function numbersIn(text: string): Set<string> {
  return new Set([...text.matchAll(NUMBER)].map((m) => m[0].replace(/\s/g, "")));
}

// Replaces every number that does not appear in the user's own text with a placeholder (list
// markers such as "1." stay).
// Returns the cleaned text and whether anything was replaced.
export function removeInventedNumbers(
  text: string,
  source: string,
): { text: string; replaced: boolean } {
  const allowed = numbersIn(source);
  let replaced = false;
  const cleaned = text.replace(NUMBER, (n: string, offset: number) => {
    if (isListMarker(n, offset, text)) return n;
    if (allowed.has(n.replace(/\s/g, ""))) return n;
    replaced = true;
    return NUMBER_PLACEHOLDER;
  });
  return { text: cleaned, replaced };
}

export function hasPlaceholder(text: string): boolean {
  return /\[[^\]]+\]/.test(text);
}
