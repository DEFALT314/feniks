"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { NewTestInput, RatingInput } from "@/lib/contracts/innovation-tester";
import { createClient } from "@/lib/supabase/server";
import { planTest, rate, signUp, withdraw, type ActionResult } from "./_lib/tests";

// Server actions are public endpoints: each one checks the session and its input itself. RLS and the
// triggers in *_tester_innovations.sql are the second line of defence.
const SIGN_IN = { ok: false, error: "Zaloguj się ponownie, żeby kontynuować." } as const;
const BAD_INPUT = { ok: false, error: "Sprawdź pola formularza i spróbuj ponownie." } as const;

const TestId = z.uuid();

export async function signUpForTest(testId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return SIGN_IN;
  const id = TestId.safeParse(testId);
  if (!id.success) return BAD_INPUT;
  const result = await signUp(await createClient(), id.data);
  // Also after a refusal: when the last seat went to someone else, the card must stop showing it
  revalidatePath("/my/tester");
  return result;
}

export async function withdrawFromTest(testId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return SIGN_IN;
  const id = TestId.safeParse(testId);
  if (!id.success) return BAD_INPUT;
  const result = await withdraw(await createClient(), user.id, id.data);
  revalidatePath("/my/tester");
  return result;
}

export async function rateTest(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return SIGN_IN;
  const rating = RatingInput.safeParse(input);
  if (!rating.success) return BAD_INPUT;
  const result = await rate(await createClient(), user.id, rating.data);
  if (result.ok) revalidatePath("/my/tester");
  return result;
}

export type PlanTestState = { ok?: boolean; error?: string };

// zod messages are in English, so the form gets its own text per field
function planTestError(field: PropertyKey | undefined): string {
  switch (field) {
    case "tytul":
      return "Wpisz nazwę testu (do 200 znaków).";
    case "opis":
      return "Opis może mieć najwyżej 3000 znaków.";
    case "miejsce":
      return "Miejsce może mieć najwyżej 200 znaków.";
    case "termin":
      return "Podaj poprawny termin.";
    case "liczba_miejsc":
      return "Liczba miejsc: od 1 do 500.";
    default:
      return BAD_INPUT.error;
  }
}

// "Zaplanuj test" on the idea card. Only the idea author passes RLS.
export async function planIdeaTest(input: unknown): Promise<PlanTestState> {
  const user = await getCurrentUser();
  if (!user) return SIGN_IN;
  const test = NewTestInput.safeParse(input);
  if (!test.success) return { ok: false, error: planTestError(test.error.issues[0]?.path[0]) };
  // Nobody could sign up for a test that already took place
  if (test.data.termin && new Date(test.data.termin) < new Date()) {
    return { ok: false, error: "Termin testu musi być w przyszłości." };
  }
  const result = await planTest(await createClient(), test.data);
  if (!result.ok) return result;
  revalidatePath("/my/tester");
  revalidatePath(`/my/creator/${test.data.idea_id}/card`);
  return { ok: true };
}
