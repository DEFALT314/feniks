// Which open calls fit an idea (step 3 of the card, "Przygotuj wniosek o pieniądze"). Computed, no AI:
// the idea's Challenges Map areas come from the Library innovations the search finds for the card
// (their categories belong to areas), or from the area the idea already has; a call fits when it is
// for one of those areas. Calls for any area (no areas set) are neutral.
import type { CallSummary } from "@/lib/contracts/ai";
import { runMatch, type MatchDeps } from "../matching/pipeline";

export type CallFit = "pasuje" | "dowolny" | "inny";
export type RankedCall = CallSummary & { fit: CallFit };
export type IdeaArea = { id: string; name: string };

// Areas of the idea, most likely first. Empty when the card is too short or nothing similar is found.
export async function ideaAreas(
  text: string,
  deps: MatchDeps,
  knownAreaId?: string | null,
): Promise<IdeaArea[]> {
  const byId = new Map(deps.areas.map((a) => [a.id, a]));
  const out: IdeaArea[] = [];
  const add = (id: string) => {
    const a = byId.get(id);
    if (a && !out.some((x) => x.id === id)) out.push({ id, name: a.nazwa });
  };
  if (knownAreaId) add(knownAreaId);
  if (text.trim().length >= 10) {
    const { response } = await runMatch({ description: text, ai: false }, deps);
    const top = response.innovations.slice(0, 2).map((m) => m.innovation.kategoria_id);
    // A weak match means no innovation solves it yet (e.g. free meals for homeless people), but the
    // area can still be clear: trust it when the two best results agree on the category.
    const categories =
      response.match_quality !== "weak"
        ? top
        : top.length === 2 && top[0] === top[1]
          ? [top[0]]
          : [];
    for (const category of categories) {
      for (const a of deps.areas) {
        if (a.kategorie_biblioteki.includes(category)) add(a.id);
      }
    }
  }
  return out;
}

// Calls that fit first, then calls for any area, then the rest; each group keeps its order
// (nearest deadline first, as listOpenCalls returns them).
export function rankCalls(calls: CallSummary[], areas: IdeaArea[]): RankedCall[] {
  const ids = new Set(areas.map((a) => a.id));
  const fit = (c: CallSummary): CallFit =>
    !c.areas?.length ? "dowolny" : c.areas.some((a) => ids.has(a)) ? "pasuje" : "inny";
  const order: Record<CallFit, number> = { pasuje: 0, dowolny: 1, inny: 2 };
  return calls
    .map((c) => ({ ...c, fit: ids.size ? fit(c) : ("dowolny" as CallFit) }))
    .sort((a, b) => order[a.fit] - order[b.fit]);
}
