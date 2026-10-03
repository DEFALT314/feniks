import type { SupabaseClient } from "@supabase/supabase-js";
import { IdeaStatus, type IdeaQueueItem } from "@/lib/contracts/admin";
import type { Database } from "@/lib/supabase/types";
import { OPEN_STATUSES } from "./status";

type Client = SupabaseClient<Database>;

export type QueueRow = IdeaQueueItem & { obszar_nazwa: string | null };

export type IdeaDetail = QueueRow & {
  opis: string | null;
  dla_kogo: string | null;
  etap: string | null;
  autor_id: string;
  komentarz: string | null;
  ekspert_id: string | null;
};

export type Expert = { id: string; nazwa: string };
export type AuditRow = {
  id: number;
  akcja: string;
  obiekt: string;
  szczegoly: unknown;
  created_at: string;
};

const IDEA_COLUMNS =
  "id, tytul, istota, opis, dla_kogo, etap, obszar_id, wyslany_at, autor_id, challenge_areas(nazwa)";

type IdeaRow = {
  id: string;
  tytul: string;
  istota: string | null;
  opis: string | null;
  dla_kogo: string | null;
  etap: string | null;
  obszar_id: string | null;
  wyslany_at: string | null;
  autor_id: string;
  challenge_areas: { nazwa: string } | null;
};

type StatusRow = {
  idea_id: string;
  status: string;
  komentarz: string | null;
  ekspert_id: string | null;
};

async function namesById(supabase: Client, ids: string[]): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("profiles").select("id, nazwa_wyswietlana").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, p.nazwa_wyswietlana]));
}

async function statusesById(supabase: Client, ids: string[]): Promise<Map<string, StatusRow>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from("idea_status")
    .select("idea_id, status, komentarz, ekspert_id")
    .in("idea_id", ids);
  return new Map(((data ?? []) as StatusRow[]).map((s) => [s.idea_id, s]));
}

function toStatus(value: string | undefined): IdeaStatus {
  const parsed = IdeaStatus.safeParse(value);
  return parsed.success ? parsed.data : "nowy";
}

/** Sent ideas, newest first, with author name, area and current status. */
export async function loadIdeaQueue(
  supabase: Client,
  filter: IdeaStatus | "open" | "all",
): Promise<QueueRow[]> {
  const { data, error } = await supabase
    .from("ideas")
    .select(IDEA_COLUMNS)
    .not("wyslany_at", "is", null)
    .order("wyslany_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Failed to load ideas: ${error.message}`);

  const ideas = (data ?? []) as unknown as IdeaRow[];
  const [names, statuses] = await Promise.all([
    namesById(supabase, [...new Set(ideas.map((i) => i.autor_id))]),
    statusesById(
      supabase,
      ideas.map((i) => i.id),
    ),
  ]);

  const rows: QueueRow[] = ideas.map((i) => ({
    idea_id: i.id,
    tytul: i.tytul,
    istota: i.istota,
    autor_nazwa: names.get(i.autor_id) ?? null,
    obszar_id: i.obszar_id,
    obszar_nazwa: i.challenge_areas?.nazwa ?? null,
    wyslany_at: i.wyslany_at!,
    status: toStatus(statuses.get(i.id)?.status),
  }));

  if (filter === "all") return rows;
  if (filter === "open") return rows.filter((r) => OPEN_STATUSES.includes(r.status));
  return rows.filter((r) => r.status === filter);
}

/** One sent idea with everything the review card needs, or null if not found / not sent. */
export async function loadIdeaDetail(supabase: Client, ideaId: string): Promise<IdeaDetail | null> {
  const { data } = await supabase
    .from("ideas")
    .select(IDEA_COLUMNS)
    .eq("id", ideaId)
    .not("wyslany_at", "is", null)
    .maybeSingle();
  if (!data) return null;

  const idea = data as unknown as IdeaRow;
  const [names, statuses] = await Promise.all([
    namesById(supabase, [idea.autor_id]),
    statusesById(supabase, [idea.id]),
  ]);
  const status = statuses.get(idea.id);
  return {
    idea_id: idea.id,
    tytul: idea.tytul,
    istota: idea.istota,
    opis: idea.opis,
    dla_kogo: idea.dla_kogo,
    etap: idea.etap,
    autor_id: idea.autor_id,
    autor_nazwa: names.get(idea.autor_id) ?? null,
    obszar_id: idea.obszar_id,
    obszar_nazwa: idea.challenge_areas?.nazwa ?? null,
    wyslany_at: idea.wyslany_at!,
    status: toStatus(status?.status),
    komentarz: status?.komentarz ?? null,
    ekspert_id: status?.ekspert_id ?? null,
  };
}

export async function loadExperts(supabase: Client): Promise<Expert[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, nazwa_wyswietlana")
    .eq("role", "ekspert")
    .order("nazwa_wyswietlana");
  return (data ?? []).map((p) => ({ id: p.id, nazwa: p.nazwa_wyswietlana ?? "Ekspert" }));
}

export async function loadRecentAudit(supabase: Client, limit = 6): Promise<AuditRow[]> {
  const { data } = await supabase
    .from("audit_log")
    .select("id, akcja, obiekt, szczegoly, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as AuditRow[];
}
