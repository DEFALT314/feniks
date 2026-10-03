"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { confirmLoginCode, recordConsent, requestLoginCode, type LoginState } from "./login";
import { safeNextPath } from "./validation";

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function sendLoginCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const next = safeNextPath(formData.get("next") as string | null);
  const redirectTo = `${await siteOrigin()}/auth/confirm?next=${encodeURIComponent(next)}`;
  return requestLoginCode(await createClient(), Object.fromEntries(formData), redirectTo);
}

export async function verifyLoginCode(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const supabase = await createClient();
  const result = await confirmLoginCode(supabase, Object.fromEntries(formData));
  if (!result.ok) return result.state;

  await recordConsent(supabase, result.userId);
  redirect(safeNextPath(formData.get("next") as string | null));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
