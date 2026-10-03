import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { SendCodeInput, VerifyCodeInput } from "./validation";

export type LoginState = {
  status: "idle" | "code-sent" | "error";
  email?: string;
  message?: string;
  fieldErrors?: Partial<Record<"email" | "code" | "consent", string>>;
};

type FormFields = Record<string, FormDataEntryValue | null>;

function firstErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: LoginState["fieldErrors"] = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if ((key === "email" || key === "code" || key === "consent") && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

// Supabase Auth error → plain Polish message for the user.
export function authErrorMessage(error: { message?: string; code?: string; status?: number }) {
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  if (error.status === 429 || text.includes("rate") || text.includes("too many")) {
    return "Wysłaliśmy już kilka kodów. Odczekaj kilka minut i spróbuj ponownie.";
  }
  if (text.includes("expired") || text.includes("invalid") || text.includes("otp")) {
    return "Kod jest nieprawidłowy albo wygasł. Wyślij nowy kod.";
  }
  if (text.includes("not authorized") || text.includes("not allowed")) {
    return "Na ten adres nie możemy teraz wysłać maila. Skorzystaj z wersji pokazowej.";
  }
  return "Coś poszło nie tak. Spróbuj ponownie za chwilę.";
}

/** Step 1: validate the form and ask Supabase to e-mail a one-time code (and a sign-in link). */
export async function requestLoginCode(
  supabase: SupabaseClient<Database>,
  fields: FormFields,
  emailRedirectTo: string,
): Promise<LoginState> {
  const parsed = SendCodeInput.safeParse({
    email: fields.email ?? "",
    consent: fields.consent === "on" || fields.consent === "true",
    next: typeof fields.next === "string" ? fields.next : undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      email: typeof fields.email === "string" ? fields.email : undefined,
      fieldErrors: firstErrors(parsed.error.issues),
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: true, emailRedirectTo },
  });
  if (error) return { status: "error", email: parsed.data.email, message: authErrorMessage(error) };

  return { status: "code-sent", email: parsed.data.email };
}

/** Step 2: check the 6-digit code. On success the session cookies are set by the Supabase client. */
export async function confirmLoginCode(
  supabase: SupabaseClient<Database>,
  fields: FormFields,
): Promise<{ ok: true; userId: string } | { ok: false; state: LoginState }> {
  const email = typeof fields.email === "string" ? fields.email : "";
  const parsed = VerifyCodeInput.safeParse({ email, code: fields.code ?? "" });
  if (!parsed.success) {
    return {
      ok: false,
      state: { status: "code-sent", email, fieldErrors: firstErrors(parsed.error.issues) },
    };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.code,
    type: "email",
  });
  if (error || !data.user) {
    return {
      ok: false,
      state: {
        status: "code-sent",
        email,
        fieldErrors: { code: error ? authErrorMessage(error) : "Nie udało się zalogować." },
      },
    };
  }
  return { ok: true, userId: data.user.id };
}

/** The consent checkbox is required before a code is sent; store its time on the first sign-in. */
export async function recordConsent(supabase: SupabaseClient<Database>, userId: string) {
  await supabase
    .from("profiles")
    .update({ zgoda_rodo_at: new Date().toISOString() })
    .eq("id", userId)
    .is("zgoda_rodo_at", null);
}
