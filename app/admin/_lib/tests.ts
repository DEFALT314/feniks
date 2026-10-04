import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/supabase/types";

// Panel ROPS → "Testy i opinie" (module IV for ROPS): tests of Library innovations and ideas, the
// feedback they collect, and reviews of innovations outside tests. Names are never shown.

type Client = SupabaseClient<Database>;

export type TestRow = {
  id: string;
  tytul: string;
  termin: string | null;
  miejsce: string | null;
  liczba_miejsc: number | null;
  innowacja_id: string | null;
  idea_id: string | null;
  subject: string; // innovation name or idea title
  zajete: number;
  ratings: number;
  average: number | null;
  proposals: number; // ratings with "co poprawić"
};

export type Opinion = {
  ocena: number;
  co_dzialalo: string | null;
  co_poprawic: string | null;
  created_at: string;
};

export type ReviewedInnovation = {
  innowacja_id: string;
  nazwa: string;
  count: number;
  average: number;
  proposals: number;
  latest: string;
};

const avg = (xs: number[]) =>
  xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
const hasText = (s: string | null) => Boolean(s && s.trim());

export async function loadTests(supabase: Client): Promise<TestRow[]> {
  const { data, error } = await supabase
    .from("tests")
    .select(
      "id, tytul, termin, miejsce, liczba_miejsc, innowacja_id, idea_id, innovations(nazwa), ideas(tytul)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Failed to load tests: ${error.message}`);
  const tests = (data ?? []) as unknown as (Omit<
    TestRow,
    "subject" | "zajete" | "ratings" | "average" | "proposals"
  > & {
    innovations: { nazwa: string } | null;
    ideas: { tytul: string } | null;
  })[];
  const ids = tests.map((t) => t.id);
  const [{ data: seats }, { data: ratings }] = await Promise.all([
    ids.length
      ? supabase.rpc("test_seats_taken", { p_test_ids: ids })
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("test_ratings").select("test_id, ocena, co_poprawic").in("test_id", ids)
      : Promise.resolve({ data: [] }),
  ]);
  const taken = new Map(
    (seats ?? []).map((s: { test_id: string; zajete: number }) => [s.test_id, s.zajete]),
  );
  return tests.map((t) => {
    const mine = (ratings ?? []).filter((r) => r.test_id === t.id);
    return {
      id: t.id,
      tytul: t.tytul,
      termin: t.termin,
      miejsce: t.miejsce,
      liczba_miejsc: t.liczba_miejsc,
      innowacja_id: t.innowacja_id,
      idea_id: t.idea_id,
      subject: t.innovations?.nazwa ?? (t.ideas?.tytul ? `pomysł: ${t.ideas.tytul}` : "—"),
      zajete: taken.get(t.id) ?? 0,
      ratings: mine.length,
      average: avg(mine.map((r) => r.ocena)),
      proposals: mine.filter((r) => hasText(r.co_poprawic)).length,
    };
  });
}

export async function loadTestOpinions(supabase: Client, testId: string): Promise<Opinion[]> {
  const { data } = await supabase
    .from("test_ratings")
    .select("ocena, co_dzialalo, co_poprawic, created_at")
    .eq("test_id", testId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Innovations reviewed outside tests, most recent activity first. */
export async function loadReviewedInnovations(supabase: Client): Promise<ReviewedInnovation[]> {
  const { data } = await supabase
    .from("innovation_reviews")
    .select("innowacja_id, ocena, co_poprawic, updated_at, innovations(nazwa)")
    .order("updated_at", { ascending: false })
    .limit(2000);
  const groups = new Map<string, ReviewedInnovation & { scores: number[] }>();
  for (const r of (data ?? []) as unknown as {
    innowacja_id: string;
    ocena: number;
    co_poprawic: string | null;
    updated_at: string;
    innovations: { nazwa: string } | null;
  }[]) {
    const g = groups.get(r.innowacja_id) ?? {
      innowacja_id: r.innowacja_id,
      nazwa: r.innovations?.nazwa ?? r.innowacja_id,
      count: 0,
      average: 0,
      proposals: 0,
      latest: r.updated_at,
      scores: [],
    };
    g.count += 1;
    g.scores.push(r.ocena);
    if (hasText(r.co_poprawic)) g.proposals += 1;
    groups.set(r.innowacja_id, g);
  }
  return [...groups.values()].map(({ scores, ...g }) => ({ ...g, average: avg(scores) ?? 0 }));
}

export async function loadInnovationOpinions(
  supabase: Client,
  innovationId: string,
): Promise<Opinion[]> {
  const { data } = await supabase
    .from("innovation_reviews")
    .select("ocena, co_dzialalo, co_poprawic, created_at:updated_at")
    .eq("innowacja_id", innovationId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as Opinion[];
}

// "Załóż test rozwiązania z Biblioteki" (messages shown to ROPS staff, in Polish).
export const NewTestInput = z.object({
  innowacja_id: z.string().min(1, { message: "Wybierz rozwiązanie z Biblioteki." }),
  tytul: z.string().trim().min(3, { message: "Wpisz nazwę testu." }).max(200),
  opis: z.string().trim().max(3000).optional(),
  miejsce: z.string().trim().max(200).optional(),
  termin: z.string().optional(), // datetime-local from the form
  liczba_miejsc: z.coerce
    .number()
    .int()
    .min(1, { message: "Co najmniej 1 miejsce." })
    .max(500)
    .optional(),
});
export type NewTestInput = z.infer<typeof NewTestInput>;

export type NewTestState = {
  status: "idle" | "saved" | "error";
  message?: string;
  fieldErrors?: Partial<Record<keyof NewTestInput, string>>;
};

export async function createInnovationTest(
  supabase: Client,
  writeAudit: (e: {
    akcja: string;
    obiekt: string;
    szczegoly?: Record<string, unknown>;
  }) => Promise<unknown>,
  form: FormData,
): Promise<NewTestState & { id?: string }> {
  const value = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" && v.trim() ? v : undefined;
  };
  const parsed = NewTestInput.safeParse({
    innowacja_id: value("innowacja_id") ?? "",
    tytul: value("tytul") ?? "",
    opis: value("opis"),
    miejsce: value("miejsce"),
    termin: value("termin"),
    liczba_miejsc: value("liczba_miejsc"),
  });
  if (!parsed.success) {
    const fieldErrors: NewTestState["fieldErrors"] = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0] as keyof NewTestInput;
      if (!fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { status: "error", fieldErrors };
  }
  const t = parsed.data;
  // datetime-local has no zone: read it as Polish time.
  const termin = t.termin
    ? new Date(`${t.termin}:00${polishOffset(t.termin)}`).toISOString()
    : null;
  const { data, error } = await supabase
    .from("tests")
    .insert({
      innowacja_id: t.innowacja_id,
      tytul: t.tytul,
      opis: t.opis ?? null,
      miejsce: t.miejsce ?? null,
      termin,
      liczba_miejsc: t.liczba_miejsc ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return { status: "error", message: "Nie udało się założyć testu." };
  await writeAudit({
    akcja: "test.dodanie",
    obiekt: `tests:${data.id}`,
    szczegoly: { tytul: t.tytul, innowacja_id: t.innowacja_id },
  }).catch(() => {});
  return {
    status: "saved",
    message: "Test założony. Mieszkańcy mogą się już zapisywać.",
    id: data.id,
  };
}

/** "+02:00" in summer, "+01:00" in winter, for a local date-time in Poland. */
export function polishOffset(localDateTime: string): string {
  const probe = new Date(`${localDateTime}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    timeZoneName: "shortOffset",
  })
    .formatToParts(probe)
    .find((p) => p.type === "timeZoneName")?.value; // e.g. "GMT+2"
  const hours = Number(parts?.replace("GMT", "") || 1);
  return `${hours >= 0 ? "+" : "-"}${String(Math.abs(hours)).padStart(2, "0")}:00`;
}
