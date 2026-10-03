// Middleman use cases shared by the endpoints: create a card, edit it, send it to ROPS.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Innovation } from "@/lib/contracts/knowledge-base";
import type { ServiceCard, ServiceCardEdit, ServiceCardRequest } from "@/lib/contracts/middleman";
import { draftServiceCard } from "./draft";
import { innovationMaterials, institutionFit } from "./facts";
import { applyEdit, FUNDING_HINT, getCard, insertCard, toServiceCard, updateCard } from "./store";

export type Deps = {
  db: SupabaseClient;
  findInnovation: (id: string) => Promise<Innovation | null>;
  notifyRops: (cardId: string, title: string) => Promise<void>;
  draft?: typeof draftServiceCard;
};

export type Result =
  { ok: true; card: ServiceCard } | { ok: false; status: 404 | 409; error: string };

const NOT_FOUND = { ok: false, status: 404, error: "Nie znaleziono karty usługi." } as const;

export async function createCard(request: ServiceCardRequest, deps: Deps): Promise<Result> {
  const innovation = await deps.findInnovation(request.innovation_id);
  if (!innovation)
    return { ok: false, status: 404, error: "Nie ma takiej innowacji w Bibliotece." };
  const fit = institutionFit(innovation, request.institution.type);
  const draft = await (deps.draft ?? draftServiceCard)(innovation, request.institution, fit);
  const row = await insertCard(deps.db, innovation.id, request.institution, {
    ...draft,
    cost: { estimate: null, funding_hint: FUNDING_HINT },
    fit,
    materials: innovationMaterials(innovation),
  });
  return { ok: true, card: toServiceCard(row, innovation) };
}

export async function editCard(id: string, edit: ServiceCardEdit, deps: Deps): Promise<Result> {
  const row = await getCard(deps.db, id);
  const innovation = row && (await deps.findInnovation(row.innovation_id));
  if (!row || !innovation) return NOT_FOUND;
  if (row.status === "wyslana_do_rops") {
    return {
      ok: false,
      status: 409,
      error: "Karta została już wysłana do ROPS i nie można jej zmienić.",
    };
  }
  const updated = await updateCard(deps.db, row, { card: applyEdit(row.card, edit) });
  return { ok: true, card: toServiceCard(updated, innovation) };
}

export async function sendCard(id: string, deps: Deps): Promise<Result> {
  const row = await getCard(deps.db, id);
  const innovation = row && (await deps.findInnovation(row.innovation_id));
  if (!row || !innovation) return NOT_FOUND;
  if (row.status === "wyslana_do_rops") return { ok: true, card: toServiceCard(row, innovation) };
  const updated = await updateCard(deps.db, row, { status: "wyslana_do_rops" });
  await deps
    .notifyRops(row.id, row.card.title)
    .catch((e) => console.error("ROPS notification failed:", (e as Error).message));
  return { ok: true, card: toServiceCard(updated, innovation) };
}
