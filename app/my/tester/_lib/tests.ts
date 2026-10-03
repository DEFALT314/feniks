import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NewTestInput,
  RatingInput,
  TestFeedback,
  TesterTest,
} from "@/lib/contracts/innovation-tester";
import type { Database } from "@/lib/supabase/types";
import {
  buildTestList,
  ratingError,
  signUpError,
  summarizeFeedback,
  type RatingRow,
  type TestRow,
} from "./model";

// Tests, sign-ups and ratings (module IV). Every query runs with the user's session, so RLS decides
// what they see and change; the database also guards seats and dates (*_tester_innovations.sql).
type Db = SupabaseClient<Database>;

export type ActionResult = { ok: true } | { ok: false; error: string };

const TEST_COLUMNS = "id, idea_id, innowacja_id, tytul, opis, miejsce, termin, liczba_miejsc";
const RATING_COLUMNS = "test_id, ocena, co_dzialalo, co_poprawic, created_at";

// innowacja_id and test_seats_taken come from *_tester_innovations.sql, which is not yet in the
// generated lib/supabase/types.ts (P4 regenerates it with pnpm db:types). Rows are checked by
// buildTestList and summarizeFeedback.
function untyped(db: Db): SupabaseClient {
  return db as unknown as SupabaseClient;
}

export type TesterPage = { tests: TesterTest[]; feedback: TestFeedback[] };

export async function loadTester(
  db: Db,
  user: { id: string; isRops: boolean },
  now = new Date(),
): Promise<TesterPage> {
  const { data: tests, error } = await untyped(db)
    .from("tests")
    .select(TEST_COLUMNS)
    .order("termin", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to load tests: ${error.message}`);
  const rows = (tests ?? []) as TestRow[];
  if (!rows.length) return { tests: [], feedback: [] };

  const ids = rows.map((t) => t.id);
  const innovationIds = [...new Set(rows.flatMap((t) => (t.innowacja_id ? [t.innowacja_id] : [])))];
  const [seats, signups, ratings, innovations, ideas] = await Promise.all([
    untyped(db).rpc("test_seats_taken", { p_test_ids: ids }),
    db.from("test_signups").select("test_id").eq("user_id", user.id).in("test_id", ids),
    db.from("test_ratings").select(RATING_COLUMNS).eq("user_id", user.id).in("test_id", ids),
    innovationIds.length
      ? db.from("innovations").select("id, nazwa").in("id", innovationIds)
      : Promise.resolve({ data: [], error: null }),
    db.from("ideas").select("id").eq("autor_id", user.id),
  ]);
  for (const result of [seats, signups, ratings, innovations, ideas]) {
    if (result.error) throw new Error(`Failed to load the tester: ${result.error.message}`);
  }

  const list = buildTestList({
    tests: rows,
    seatsTaken: new Map(
      ((seats.data ?? []) as { test_id: string; zajete: number }[]).map((s) => [
        s.test_id,
        s.zajete,
      ]),
    ),
    mySignups: new Set((signups.data ?? []).map((s) => s.test_id)),
    myRatings: new Map(((ratings.data ?? []) as RatingRow[]).map((r) => [r.test_id, r])),
    innovationNames: new Map((innovations.data ?? []).map((i) => [i.id, i.nazwa])),
    myIdeaIds: new Set((ideas.data ?? []).map((i) => i.id)),
    isRops: user.isRops,
    now,
  });

  // Feedback only for the tests this user runs; RLS hides the rest anyway
  const managed = list.filter((t) => t.zarzadzam).map((t) => t.id);
  if (!managed.length) return { tests: list, feedback: [] };
  const { data: all, error: feedbackError } = await db
    .from("test_ratings")
    .select(RATING_COLUMNS)
    .in("test_id", managed);
  if (feedbackError) throw new Error(`Failed to load feedback: ${feedbackError.message}`);
  return { tests: list, feedback: summarizeFeedback(managed, (all ?? []) as RatingRow[]) };
}

export async function signUp(db: Db, testId: string): Promise<ActionResult> {
  const { error } = await db.from("test_signups").insert({ test_id: testId });
  // 23505: already signed up (e.g. a second click in another tab), which is what the user wanted
  if (error && error.code !== "23505") return { ok: false, error: signUpError(error.code) };
  return { ok: true };
}

export async function withdraw(db: Db, userId: string, testId: string): Promise<ActionResult> {
  const { error } = await db
    .from("test_signups")
    .delete()
    .eq("test_id", testId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: "Nie udało się wypisać. Spróbuj ponownie za chwilę." };
  return { ok: true };
}

// One rating per person and test: sending again replaces it. The author is notified only about the
// first one (trigger after insert).
export async function rate(db: Db, userId: string, input: RatingInput): Promise<ActionResult> {
  const { error } = await db
    .from("test_ratings")
    .upsert({ ...input, user_id: userId }, { onConflict: "test_id,user_id" });
  if (error) return { ok: false, error: ratingError(error.code) };
  return { ok: true };
}

export async function planTest(
  db: Db,
  input: NewTestInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { data, error } = await db.from("tests").insert(input).select("id").single();
  if (error || !data) {
    return { ok: false, error: "Nie udało się zapisać testu. Spróbuj ponownie za chwilę." };
  }
  return { ok: true, id: data.id };
}

// How many tests the author planned for an idea (shown on the idea card)
export async function countIdeaTests(db: Db, ideaId: string): Promise<number> {
  const { count, error } = await db
    .from("tests")
    .select("id", { count: "exact", head: true })
    .eq("idea_id", ideaId);
  if (error) throw new Error(`Failed to count tests: ${error.message}`);
  return count ?? 0;
}
