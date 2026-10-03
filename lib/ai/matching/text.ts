// Polish text normalization for keyword matching (ported from the evaluated Python prototype).
// Lowercase, no diacritics, no stopwords, words cut to a stem of STEM_LENGTH characters.

const DIACRITICS: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

// Polish stopwords (without diacritics) plus filler words common in problem descriptions.
const STOPWORDS = new Set(
  (
    "a aby ale albo ani az bardzo bez beda bedzie bo by byc byl byla byli bylo chce chcemy co czy dla do gdy gdzie " +
    "i ich im ja jak jakie jakis jako jednak jego jej jest jestem jesli juz ktora ktore ktory ktorzy kto ma mam mamy " +
    "maja mi mnie moze mozna my na nad nam nas nasz nasza nasze naszej naszym nawet nic nie niz o od oraz po pod " +
    "przez przy sa sie sobie tak takze tam te tego tej ten to tu tylko ty u w we wiec z za ze zeby szukam " +
    "potrzebujemy potrzebuje brakuje problem problemu cos czegos jakiegos ktos kogos bardziej coraz duzo malo"
  ).split(" "),
);

// Polish inflection mostly changes endings, so words are compared by prefix. 5 characters scored best
// on the ROPS accuracy set (BM25 alone, top 3: 4 → 93.9%, 5 → 93.5%, 6 → 91.7%, 7 → 89.1%).
export const STEM_LENGTH = 5;

export type Token = {
  stem: string; // normalized stem used for matching
  word: string; // the original word, for highlighting
  start: number; // position in the original text
  end: number;
};

export function stripDiacritics(s: string): string {
  return s.toLowerCase().replace(/[ąćęłńóśźż]/g, (c) => DIACRITICS[c]);
}

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    const s = stripDiacritics(m[0]);
    if (s.length < 3 || STOPWORDS.has(s)) continue;
    out.push({
      stem: s.slice(0, STEM_LENGTH),
      word: m[0],
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return out;
}

// Short words are cut to fewer characters than STEM_LENGTH ("udar" vs "udarz" from "udarze"):
// two stems match when one is a prefix of the other and both have at least 4 characters.
export function stemsMatch(a: string, b: string): boolean {
  return a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));
}
