"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  changePassword,
  recordConsent,
  requestPasswordReset,
  resendConfirmation,
  signInWithPassword,
  signUpWithPassword,
  type AuthFormState,
} from "./login";
import { requestOrigin, safeNextPath } from "./validation";

async function siteOrigin() {
  return requestOrigin(await headers());
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const result = await signInWithPassword(await createClient(), Object.fromEntries(formData));
  if (!result.ok) return result.state;
  redirect(safeNextPath(formData.get("next") as string | null));
}

// Where links from e-mails land: /auth/confirm on the host the browser used, then `next`.
async function confirmUrl(next: string) {
  return `${await siteOrigin()}/auth/confirm?next=${encodeURIComponent(next)}`;
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const supabase = await createClient();
  const next = safeNextPath(formData.get("next") as string | null);
  const result = await signUpWithPassword(
    supabase,
    Object.fromEntries(formData),
    await confirmUrl(next),
  );
  if (!result.ok) return result.state;
  await recordConsent(supabase, result.userId);
  redirect(safeNextPath(formData.get("next") as string | null));
}

export async function sendPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const redirectTo = await confirmUrl("/update-password");
  return requestPasswordReset(await createClient(), Object.fromEntries(formData), redirectTo);
}

export async function setNewPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const state = await changePassword(await createClient(), Object.fromEntries(formData));
  if (state) return state;
  redirect("/");
}

export async function resendSignupEmail(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const next = safeNextPath(formData.get("next") as string | null);
  return resendConfirmation(
    await createClient(),
    Object.fromEntries(formData),
    await confirmUrl(next),
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
