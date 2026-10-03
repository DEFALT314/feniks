// Descriptions of an emergency (violence, thoughts of suicide) get the emergency phone numbers above
// the result: an innovation from the Library is not the first help such a person needs.
// Matched on the text without diacritics, so "przemoc" and "bije zone" written without Polish
// letters are recognised too. False alarms cost little (one extra box), misses cost a lot.
import { stripDiacritics } from "@/lib/ai/matching/text";

export type Crisis = "violence" | "suicide";

const SUICIDE =
  /samobo[jy]|odebra\w* sobie zyci|zabi\w* sie\b|\bsie zabi\w*|nie chce (mi sie )?zyc|chce umrzec|targn\w* sie/;
const VIOLENCE =
  /przemoc|\bbij[ea]\w*|\bbil[ai]?\b|pobi\w*|katuj\w*|zneca\w*|molest\w*|gwalc\w*|zgwalc\w*|grozi mi\b/;

export function detectCrisis(text: string): Crisis | null {
  const t = stripDiacritics(text);
  if (SUICIDE.test(t)) return "suicide";
  if (VIOLENCE.test(t)) return "violence";
  return null;
}
