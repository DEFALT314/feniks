// Contract of module IV Innovation tester (P2, #36): tests of ideas and Library innovations,
// sign-ups and ratings. Tables: public.tests, public.test_signups, public.test_ratings
// (migrations *_creator_tester.sql and *_tester_innovations.sql).
// The page /my/tester uses Server Actions (app/my/tester/actions.ts), no REST endpoint.
// Sample data: lib/contracts/fixtures/innovation-tester.json. After 17:00, changes only by adding fields.
import { z } from "zod";
import fixture from "./fixtures/innovation-tester.json";

// Optional free text: blank becomes null, so the database never stores "   "
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

// --- What is being tested: a user's idea or an innovation from the Library ---

export const TestSubject = z.discriminatedUnion("typ", [
  z.object({ typ: z.literal("pomysl"), idea_id: z.uuid() }),
  z.object({ typ: z.literal("innowacja"), innowacja_id: z.string().min(1), nazwa: z.string() }),
]);
export type TestSubject = z.infer<typeof TestSubject>;

// --- A rating: 1–5 plus what worked and what to improve ---

export const RatingScore = z.number().int().min(1).max(5);

export const RatingInput = z.object({
  test_id: z.uuid(),
  ocena: RatingScore,
  co_dzialalo: optionalText(2000),
  co_poprawic: optionalText(2000),
});
export type RatingInput = z.infer<typeof RatingInput>;

export const Rating = z.object({
  ocena: RatingScore,
  co_dzialalo: z.string().nullable(),
  co_poprawic: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
});
export type Rating = z.infer<typeof Rating>;

// --- One test on the list, as seen by the signed-in user ---

export const TesterTest = z.object({
  id: z.uuid(),
  tytul: z.string(),
  opis: z.string().nullable(),
  miejsce: z.string().nullable(),
  termin: z.iso.datetime({ offset: true }).nullable(),
  liczba_miejsc: z.number().int().positive().nullable(), // null = no limit
  zajete: z.number().int().nonnegative(), // seats taken
  przedmiot: TestSubject,
  zapisany: z.boolean(), // the user signed up
  zapisy_otwarte: z.boolean(), // the date has not passed and a seat is free
  moja_ocena: Rating.nullable(),
  zarzadzam: z.boolean(), // the user runs this test (idea author or ROPS) and reads its feedback
});
export type TesterTest = z.infer<typeof TesterTest>;

// --- Feedback for the person running a test: no names, only the ratings ---

export const TestFeedback = z.object({
  test_id: z.uuid(),
  liczba_ocen: z.number().int().nonnegative(),
  srednia: z.number().min(1).max(5).nullable(), // null = no ratings yet
  uwagi: z.array(Rating),
});
export type TestFeedback = z.infer<typeof TestFeedback>;

// --- The idea author plans a test of their idea ---

export const NewTestInput = z.object({
  idea_id: z.uuid(),
  tytul: z.string().trim().min(1).max(200),
  opis: optionalText(3000),
  miejsce: optionalText(200),
  termin: z.iso
    .datetime({ offset: true })
    .nullish()
    .transform((value) => value ?? null),
  liczba_miejsc: z
    .number()
    .int()
    .min(1)
    .max(500)
    .nullish()
    .transform((value) => value ?? null),
});
export type NewTestInput = z.infer<typeof NewTestInput>;

export const testerFixture = z
  .object({ testy: z.array(TesterTest), opinie: z.array(TestFeedback) })
  .parse(fixture);
