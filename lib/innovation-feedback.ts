import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/types";

// Innovation tester, "ocena istniejących rozwiązań" (P4): ratings of any Library innovation
// (table innovation_reviews) plus the tests ROPS runs for it. Pure logic over a Supabase client.

type Client = SupabaseClient<Database>;

// Messages are shown to users, so they are in Polish.
export const ReviewInput = z.object({
  ocena: z.coerce
    .number({ message: "Wybierz ocenę od 1 do 5." })
    .int()
    .min(1, { message: "Wybierz ocenę od 1 do 5." })
    .max(5, { message: "Wybierz ocenę od 1 do 5." }),
  co_dzialalo: z.string().trim().max(2000).optional(),
  co_poprawic: z.string().trim().max(2000).optional(),
});
export type ReviewInput = z.infer<typeof ReviewInput>;

export type OpenTest = { id: string; tytul: string; termin: string | null; miejsce: string | null };
export type MyReview = { ocena: number; co_dzialalo: string | null; co_poprawic: string | null };

export type FeedbackSummary = {
  average: number | null; // reviews + test ratings, rounded to 0.1
  count: number;
  openTests: OpenTest[]; // visible to signed-in users only (tests RLS)
};

/** Public numbers plus the tests one can still join (termin in the future or not set). */
export async function getFeedbackSummary(
  supabase: Client,
  innovationId: string,
  now = new Date(),
): Promise<FeedbackSummary> {
  const [{ data: summary }, { data: tests }] = await Promise.all([
    supabase.rpc("innovation_feedback_summary", { p_innowacja_id: innovationId }),
    supabase
      .from("tests")
      .select("id, tytul, termin, miejsce")
      .eq("innowacja_id", innovationId)
      .or(`termin.is.null,termin.gte.${now.toISOString()}`)
      .order("termin", { ascending: true, nullsFirst: false }),
  ]);
  const row = Array.isArray(summary) ? summary[0] : summary;
  return {
    average: row?.srednia != null ? Number(row.srednia) : null,
    count: row?.ocen ?? 0,
    openTests: (tests ?? []) as OpenTest[],
  };
}

export async function getMyReview(
  supabase: Client,
  innovationId: string,
  userId: string,
): Promise<MyReview | null> {
  const { data } = await supabase
    .from("innovation_reviews")
    .select("ocena, co_dzialalo, co_poprawic")
    .eq("innowacja_id", innovationId)
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

export type ReviewState = {
  status: "idle" | "saved" | "error";
  message?: string;
  fieldErrors?: Partial<Record<keyof ReviewInput, string>>;
};

/** Adds or updates the signed-in user's review of an innovation (one per person). */
export async function saveReview(
  supabase: Client,
  userId: string,
  innovationId: string,
  fields: Record<string, FormDataEntryValue | null>,
): Promise<ReviewState> {
  const text = (k: string) =>
    typeof fields[k] === "string" && String(fields[k]).trim() ? String(fields[k]) : undefined;
  const parsed = ReviewInput.safeParse({
    ocena: fields.ocena ?? undefined,
    co_dzialalo: text("co_dzialalo"),
    co_poprawic: text("co_poprawic"),
  });
  if (!parsed.success) {
    const fieldErrors: ReviewState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ReviewInput;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", fieldErrors };
  }
  const row = {
    ocena: parsed.data.ocena,
    co_dzialalo: parsed.data.co_dzialalo ?? null,
    co_poprawic: parsed.data.co_poprawic ?? null,
  };
  const existing = await getMyReview(supabase, innovationId, userId);
  const { error } = existing
    ? await supabase
        .from("innovation_reviews")
        .update(row)
        .eq("innowacja_id", innovationId)
        .eq("user_id", userId)
    : await supabase.from("innovation_reviews").insert({ innowacja_id: innovationId, ...row });
  if (error) return { status: "error", message: "Nie udało się zapisać opinii. Spróbuj ponownie." };
  return {
    status: "saved",
    message: row.co_poprawic
      ? "Dziękujemy! Propozycja usprawnienia trafiła do ROPS."
      : "Dziękujemy za opinię!",
  };
}

const STARS = ["", "1 na 5", "2 na 5", "3 na 5", "4 na 5", "5 na 5"];
export const formatAverage = (avg: number) => avg.toFixed(1).replace(".", ",");
export function opinionsLabel(n: number): string {
  if (n === 1) return "1 opinia";
  const lastTwo = n % 100;
  const last = n % 10;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? `${n} opinie` : `${n} opinii`;
}
export const starsLabel = (n: number) => STARS[n] ?? "";
