// Splits a text into segments with the matching words highlighted (TextSegment in lib/contracts/match.ts).
import type { TextSegment } from "@/lib/contracts/match";
import { stemsMatch, tokenize } from "./text";

// Highlight every word of `text` whose stem matches one of `stems`. Highlighted words separated only
// by spaces or a short preposition become one segment ("sprzęt w domu" stays a single <mark>),
// while conjunctions keep phrases apart ("opieki | i | sprzętu", as in the Dopasuj mockup).
const JOINABLE_GAP = /^\s+(?:(?!(?:i|a)\s)\p{L}{1,2}\s+)?$/iu;
export function highlight(text: string, stems: Iterable<string>): TextSegment[] {
  const wanted = [...stems];
  const marks = tokenize(text).filter((t) => wanted.some((s) => stemsMatch(t.stem, s)));
  const segments: TextSegment[] = [];
  let pos = 0;
  for (const t of marks) {
    const last = segments.at(-1);
    const gap = text.slice(pos, t.start);
    if (last?.highlight && JOINABLE_GAP.test(gap)) {
      last.text += gap + t.word;
    } else {
      if (gap) segments.push({ text: gap, highlight: false });
      segments.push({ text: t.word, highlight: true });
    }
    pos = t.end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), highlight: false });
  return segments.length ? segments : [{ text, highlight: false }];
}

export function stemsOf(text: string): Set<string> {
  return new Set(tokenize(text).map((t) => t.stem));
}
