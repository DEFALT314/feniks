"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  changePassword,
  recordConsent,
  requestPasswordReset,
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

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const supabase = await createClient();
  const result = await signUpWithPassword(supabase, Object.fromEntries(formData));
  if (!result.ok) return result.state;
  await recordConsent(supabase, result.userId);
  redirect(safeNextPath(formData.get("next") as string | null));
}

export async function sendPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const redirectTo = `${await siteOrigin()}/auth/confirm?next=${encodeURIComponent("/update-password")}`;
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
