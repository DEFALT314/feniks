// Reads the canvas answers of a saved idea for the AI endpoints, with the user's session: RLS returns
// them only to the author (and to ROPS and experts). Answers that no longer fit their question are skipped.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { answerSchema, fields } from "@/app/my/creator/_lib/canvas";
import type { Answers } from "./canvas-facts";

export async function canvasAnswers(
  db: SupabaseClient,
  ideaId: string | undefined,
): Promise<Answers> {
  if (!ideaId) return {};
  const { data, error } = await db
    .from("idea_canvas")
    .select("pole_id, odpowiedz")
    .eq("idea_id", ideaId);
  if (error) {
    console.error("canvas answers not read:", error.message);
    return {};
  }
  const answers: Answers = {};
  for (const row of (data ?? []) as { pole_id: string; odpowiedz: unknown }[]) {
    const field = fields.find((f) => f.id === row.pole_id);
    const parsed = field ? answerSchema(field).safeParse(row.odpowiedz) : null;
    if (parsed?.success) answers[row.pole_id] = parsed.data;
  }
  return answers;
}
