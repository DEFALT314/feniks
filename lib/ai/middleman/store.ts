// Service cards in public.middleman_cards (RLS: the author owns them; ROPS reads the sent ones).
// Uses the session client passed in (CLAUDE.md rule 3), never the service key.
import type { SupabaseClient } from "@supabase/supabase-js";
import { InnovationSummary, type Innovation } from "@/lib/contracts/knowledge-base";
import type {
  InstitutionFit,
  InstitutionProfile,
  Material,
  ServiceCard,
  ServiceCardEdit,
} from "@/lib/contracts/middleman";
import type { ServiceDraft } from "./draft";

export const FUNDING_HINT = "Sprawdź aktualne nabory w HubMI.";

// What is stored in the `card` jsonb column.
export type CardBody = ServiceDraft & {
  cost: { estimate: string | null; funding_hint: string };
  fit: InstitutionFit;
  materials: Material[];
};

type Row = {
  id: string;
  innovation_id: string;
  institution: InstitutionProfile;
  card: CardBody;
  version: number;
  status: "szkic" | "wyslana_do_rops";
  created_at: string;
  updated_at: string;
};

const iso = (t: string) => new Date(t).toISOString();

export function toServiceCard(row: Row, innovation: Innovation): ServiceCard {
  const c = row.card;
  return {
    id: row.id,
    version: row.version,
    title: c.title,
    for_whom: c.for_whom,
    how_it_works: c.how_it_works,
    who_delivers: c.who_delivers,
    cost: c.cost,
    risks: c.risks,
    first_steps: c.first_steps,
    based_on: InnovationSummary.parse(innovation),
    institution: row.institution,
    status: row.status,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
    fit: c.fit,
    materials: c.materials,
  };
}

export async function insertCard(
  db: SupabaseClient,
  innovationId: string,
  institution: InstitutionProfile,
  card: CardBody,
): Promise<Row> {
  const { data, error } = await db
    .from("middleman_cards")
    .insert({ innovation_id: innovationId, institution, card })
    .select("*")
    .single();
  if (error) throw new Error(`could not save the card: ${error.message}`);
  return data as Row;
}

export async function getCard(db: SupabaseClient, id: string): Promise<Row | null> {
  const { data } = await db.from("middleman_cards").select("*").eq("id", id).maybeSingle();
  return (data as Row | null) ?? null;
}

export async function listMyCards(db: SupabaseClient, ownerId: string): Promise<Row[]> {
  const { data } = await db
    .from("middleman_cards")
    .select("*")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false })
    .limit(20);
  return (data as Row[] | null) ?? [];
}

export function applyEdit(card: CardBody, edit: ServiceCardEdit): CardBody {
  const { cost_estimate, ...fields } = edit;
  return {
    ...card,
    ...fields,
    cost: cost_estimate === undefined ? card.cost : { ...card.cost, estimate: cost_estimate },
  };
}

export async function updateCard(
  db: SupabaseClient,
  row: Row,
  patch: { card?: CardBody; status?: Row["status"] },
): Promise<Row> {
  const { data, error } = await db
    .from("middleman_cards")
    .update({ ...patch, version: patch.card ? row.version + 1 : row.version })
    .eq("id", row.id)
    .select("*")
    .single();
  if (error) throw new Error(`could not update the card: ${error.message}`);
  return data as Row;
}

export type { Row as CardRow };
