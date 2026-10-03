// Removes personal data before any text reaches an AI model (CLAUDE.md, rule 5).
// "•••" is not a word, so it does not affect keyword matching or highlighting.

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PESEL = /(?:\bpesel\.?:?\s*)?\b\d{11}\b/gi;
const PHONE =
  /(?:\b(?:tel|telefon|nr|kom)\.?:?\s*)?(?:\+?48[\s-]?)?\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/gi;
const IBAN = /\b(?:PL)?\s?\d{2}(?:\s?\d{4}){6}\b/gi;

export const REDACTED = "•••";

export function redactPersonalData(text: string): string {
  return text
    .replace(EMAIL, REDACTED)
    .replace(IBAN, REDACTED)
    .replace(PESEL, REDACTED)
    .replace(PHONE, REDACTED);
}
