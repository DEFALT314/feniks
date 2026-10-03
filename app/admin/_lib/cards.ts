import type { SupabaseClient } from "@supabase/supabase-js";
import { InstitutionProfile } from "@/lib/contracts/middleman";
import type { Database } from "@/lib/supabase/types";

// Service cards sent to ROPS from the Middleman (P3, module VII). RLS lets ROPS read only cards
// with status "wyslana_do_rops"; this module only reads them for the panel (#76).

type Client = SupabaseClient<Database>;

export type CardSummary = {
  id: string;
  title: string;
  institution: string;
  innovationId: string;
  innovationName: string | null;
  ownerId: string;
  ownerName: string | null;
  updatedAt: string;
};

export type CardDetail = CardSummary & {
  version: number;
  profile: InstitutionProfile | null;
  forWhom: string;
  howItWorks: string[];
  whoDelivers: string;
  costEstimate: string | null;
  fundingHint: string;
  risks: string;
  firstSteps: string[];
};

type Row = {
  id: string;
  owner_id: string;
  innovation_id: string;
  institution: unknown;
  card: unknown;
  version: number;
  updated_at: string;
  innovations: { nazwa: string } | null;
};

const text = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

function profileOf(value: unknown): InstitutionProfile | null {
  const p = InstitutionProfile.safeParse(value);
  return p.success ? p.data : null;
}

async function ownerNames(supabase: Client, ids: string[]) {
  if (ids.length === 0) return new Map<string, string | null>();
  const { data } = await supabase.from("profiles").select("id, nazwa_wyswietlana").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p.nazwa_wyswietlana]));
}

function toSummary(r: Row, names: Map<string, string | null>): CardSummary {
  const card = (r.card ?? {}) as Record<string, unknown>;
  return {
    id: r.id,
    title: text(card.title) || "Karta usługi",
    institution: profileOf(r.institution)?.name ?? "Instytucja",
    innovationId: r.innovation_id,
    innovationName: r.innovations?.nazwa ?? null,
    ownerId: r.owner_id,
    ownerName: names.get(r.owner_id) ?? null,
    updatedAt: r.updated_at,
  };
}

const COLUMNS =
  "id, owner_id, innovation_id, institution, card, version, updated_at, innovations(nazwa)";

/** Cards sent to ROPS, newest first. */
export async function loadSentCards(supabase: Client): Promise<CardSummary[]> {
  const { data, error } = await supabase
    .from("middleman_cards")
    .select(COLUMNS)
    .eq("status", "wyslana_do_rops")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to load service cards: ${error.message}`);
  const rows = (data ?? []) as unknown as Row[];
  const names = await ownerNames(supabase, [...new Set(rows.map((r) => r.owner_id))]);
  return rows.map((r) => toSummary(r, names));
}

/** One sent card, or null when it does not exist or was not sent (RLS hides drafts). */
export async function loadSentCard(supabase: Client, id: string): Promise<CardDetail | null> {
  const { data } = await supabase
    .from("middleman_cards")
    .select(COLUMNS)
    .eq("id", id)
    .eq("status", "wyslana_do_rops")
    .maybeSingle();
  if (!data) return null;
  const r = data as unknown as Row;
  const names = await ownerNames(supabase, [r.owner_id]);
  const card = (r.card ?? {}) as Record<string, unknown>;
  const cost = (card.cost ?? {}) as Record<string, unknown>;
  return {
    ...toSummary(r, names),
    version: r.version,
    profile: profileOf(r.institution),
    forWhom: text(card.for_whom),
    howItWorks: list(card.how_it_works),
    whoDelivers: text(card.who_delivers),
    costEstimate: typeof cost.estimate === "string" ? cost.estimate : null,
    fundingHint: text(cost.funding_hint),
    risks: text(card.risks),
    firstSteps: list(card.first_steps),
  };
}
