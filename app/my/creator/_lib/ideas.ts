import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { IdeaStatus } from "@/lib/contracts/admin";
import { IdeaStage } from "@/lib/contracts/ai";
import {
  Idea,
  IdeaCardInput,
  type CanvasAnswer,
  type IdeaWithCanvas,
} from "@/lib/contracts/idea-creator";
import type { Database, Json } from "@/lib/supabase/types";
import { answerSchema, fields, stageFromAnswers } from "./canvas";
import { currentReview } from "./submission";

// Ideas of the signed-in author in public.ideas and public.idea_canvas (migration *_creator_tester.sql).
// Every query runs with the user's session, so RLS limits it to their own ideas.
type Db = SupabaseClient<Database>;

export type MyIdea = IdeaWithCanvas & {
  status: IdeaStatus | null; // latest ROPS review (view idea_status); null = none yet
  komentarz: string | null; // ROPS comment for the author
};

const IDEA_COLUMNS =
  "id, tytul, opis, istota, dla_kogo, etap, obszar_id, wyslany_at, created_at, updated_at";

type IdeaRow = Database["public"]["Tables"]["ideas"]["Row"];
type StatusRow = Database["public"]["Views"]["idea_status"]["Row"];

function toIdea(
  row: Omit<IdeaRow, "autor_id">,
  answers: Record<string, CanvasAnswer>,
  review: StatusRow | undefined,
): MyIdea {
  const stage = IdeaStage.safeParse(row.etap);
  const status = IdeaStatus.safeParse(review?.status);
  return {
    id: row.id,
    tytul: row.tytul,
    opis: row.opis,
    istota: row.istota,
    dla_kogo: row.dla_kogo,
    etap: stage.success ? stage.data : null,
    obszar_id: row.obszar_id,
    wyslany_at: row.wyslany_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    answers,
    status: status.success ? status.data : null,
    komentarz: review?.komentarz ?? null,
  };
}

// Stored answers are checked again: an answer that no longer fits its field is skipped, not shown broken
function answersByIdea(rows: { idea_id: string; pole_id: string; odpowiedz: unknown }[]) {
  const byIdea = new Map<string, Record<string, CanvasAnswer>>();
  for (const row of rows) {
    const field = fields.find((f) => f.id === row.pole_id);
    const parsed = field ? answerSchema(field).safeParse(row.odpowiedz) : null;
    if (!parsed?.success) continue;
    const answers = byIdea.get(row.idea_id) ?? {};
    answers[row.pole_id] = parsed.data;
    byIdea.set(row.idea_id, answers);
  }
  return byIdea;
}

async function load(db: Db, authorId: string, ideaId?: string): Promise<MyIdea[]> {
  let query = db.from("ideas").select(IDEA_COLUMNS).eq("autor_id", authorId);
  if (ideaId) query = query.eq("id", ideaId);
  const { data: rows, error } = await query.order("updated_at", { ascending: false });
  if (error) throw new Error(`Failed to load ideas: ${error.message}`);
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const [canvas, statuses] = await Promise.all([
    db.from("idea_canvas").select("idea_id, pole_id, odpowiedz").in("idea_id", ids),
    db.from("idea_status").select("*").in("idea_id", ids),
  ]);
  if (canvas.error) throw new Error(`Failed to load canvas: ${canvas.error.message}`);
  const answers = answersByIdea(canvas.data);
  const reviews = new Map((statuses.data ?? []).map((s) => [s.idea_id, s]));
  return rows.map((row) =>
    toIdea(row, answers.get(row.id) ?? {}, currentReview(row.wyslany_at, reviews.get(row.id))),
  );
}

export function listMyIdeas(db: Db, authorId: string): Promise<MyIdea[]> {
  return load(db, authorId);
}

export async function getMyIdea(db: Db, authorId: string, ideaId: string): Promise<MyIdea | null> {
  if (!isUuid(ideaId)) return null;
  return (await load(db, authorId, ideaId))[0] ?? null;
}

export type SaveResult = { ok: true } | { ok: false; error: string };

const NOT_FOUND: SaveResult = { ok: false, error: "Nie ma takiego pomysłu albo nie jest Twój." };

export async function createIdea(
  db: Db,
  title: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = Idea.shape.tytul.safeParse(title);
  if (!parsed.success) return { ok: false, error: "Wpisz roboczy tytuł pomysłu." };
  const { data, error } = await db
    .from("ideas")
    .insert({ tytul: parsed.data })
    .select("id")
    .single();
  if (error || !data)
    return { ok: false, error: "Nie udało się utworzyć pomysłu. Spróbuj ponownie." };
  return { ok: true, id: data.id };
}

const LOCKED: SaveResult = {
  ok: false,
  error: "Pomysł jest w ROPS. Edycja wróci, jeśli ROPS poprosi o poprawki.",
};

// Database errors raised by migration *_creator_submit.sql
const LOCKED_CODE = "HM423";

// The author's own idea, if they may edit it now (never sent, or ROPS asked for changes)
async function editableIdea(db: Db, authorId: string, ideaId: string) {
  if (!isUuid(ideaId)) return { idea: null, editable: false };
  const [{ data: idea }, { data: editable }] = await Promise.all([
    db.from("ideas").select("id, etap").eq("id", ideaId).eq("autor_id", authorId).maybeSingle(),
    untyped(db).rpc("idea_editable", { p_idea_id: ideaId }),
  ]);
  return { idea, editable: editable === true };
}

/** Saves one canvas answer (null clears it). The readiness answer fills an empty stage on the card. */
export async function saveAnswer(
  db: Db,
  authorId: string,
  ideaId: string,
  fieldId: string,
  answer: CanvasAnswer | null,
): Promise<SaveResult> {
  const field = fields.find((f) => f.id === fieldId);
  if (!field) return { ok: false, error: "Nieznane pytanie." };
  if (answer !== null && !answerSchema(field).safeParse(answer).success) {
    return { ok: false, error: "Ta odpowiedź nie pasuje do pytania." };
  }

  const { idea, editable } = await editableIdea(db, authorId, ideaId);
  if (!idea) return NOT_FOUND;
  if (!editable) return LOCKED;

  const { error } =
    answer === null
      ? await db.from("idea_canvas").delete().eq("idea_id", ideaId).eq("pole_id", fieldId)
      : await db
          .from("idea_canvas")
          .upsert({ idea_id: ideaId, pole_id: fieldId, odpowiedz: answer as Json });
  if (error?.code === LOCKED_CODE) return LOCKED;
  if (error) return { ok: false, error: "Nie udało się zapisać odpowiedzi." };

  const stage = answer ? stageFromAnswers({ [fieldId]: answer }) : null;
  if (stage && idea.etap === null) {
    await db.from("ideas").update({ etap: stage }).eq("id", ideaId);
  }
  return { ok: true };
}

export async function saveCard(
  db: Db,
  authorId: string,
  ideaId: string,
  input: IdeaCardInput,
): Promise<SaveResult> {
  const parsed = IdeaCardInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Sprawdź pola fiszki." };
  const { idea, editable } = await editableIdea(db, authorId, ideaId);
  if (!idea) return NOT_FOUND;
  if (!editable) return LOCKED;
  const { data, error } = await db
    .from("ideas")
    .update(parsed.data)
    .eq("id", ideaId)
    .select("id")
    .maybeSingle();
  if (error?.code === LOCKED_CODE) return LOCKED;
  if (error) return { ok: false, error: "Nie udało się zapisać fiszki." };
  return data ? { ok: true } : NOT_FOUND;
}

export type SendResult =
  | { ok: true; resent: boolean }
  | { ok: false; reason: "not-found" | "with-rops" | "incomplete" | "failed" };

const SEND_ERRORS: Record<string, Exclude<SendResult, { ok: true }>["reason"]> = {
  HM404: "not-found",
  HM409: "with-rops",
  HM422: "incomplete",
};

/**
 * Sends the idea to ROPS through public.wyslij_pomysl(): the database locks the row, checks the
 * author, the state and the required fields, and sets wyslany_at with its own clock.
 */
export async function sendIdea(db: Db, ideaId: string): Promise<SendResult> {
  if (!isUuid(ideaId)) return { ok: false, reason: "not-found" };
  const { data, error } = await untyped(db).rpc("wyslij_pomysl", { p_idea_id: ideaId });
  if (error) return { ok: false, reason: SEND_ERRORS[error.code ?? ""] ?? "failed" };
  return { ok: true, resent: data === "ponownie" };
}

// wyslij_pomysl and idea_editable come from *_creator_submit.sql, which is not yet in the generated
// lib/supabase/types.ts (P4 regenerates it with pnpm db:types)
function untyped(db: Db): SupabaseClient {
  return db as unknown as SupabaseClient;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
