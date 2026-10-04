import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { PasswordResetInput, SignInInput, SignUpInput, UpdatePasswordInput } from "./validation";

type FieldName = "email" | "password" | "consent";

export type AuthFormState = {
  status: "idle" | "error" | "sent";
  email?: string;
  message?: string;
  fieldErrors?: Partial<Record<FieldName, string>>;
  // Sign-in refused because the address is not confirmed yet: offer to resend the link.
  unconfirmed?: boolean;
};

type FormFields = Record<string, FormDataEntryValue | null>;
type AuthResult = { ok: true; userId: string } | { ok: false; state: AuthFormState };

function firstErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: AuthFormState["fieldErrors"] = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if ((key === "email" || key === "password" || key === "consent") && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

const text = (v: FormDataEntryValue | null | undefined) => (typeof v === "string" ? v : "");

// Supabase Auth error → plain Polish message for the user.
export function authErrorMessage(error: { message?: string; code?: string; status?: number }) {
  const t = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  if (error.status === 429 || t.includes("rate") || t.includes("too many")) {
    return "Zbyt wiele prób. Odczekaj kilka minut i spróbuj ponownie.";
  }
  if (t.includes("invalid_credentials") || t.includes("invalid login credentials")) {
    return "Nieprawidłowy e-mail lub hasło.";
  }
  if (t.includes("already") || t.includes("user_already_exists") || t.includes("email_exists")) {
    return "Konto z tym adresem już istnieje. Zaloguj się.";
  }
  if (t.includes("weak_password") || t.includes("weak password")) {
    return "To hasło jest zbyt łatwe do odgadnięcia. Wybierz dłuższe.";
  }
  if (t.includes("same_password") || t.includes("different from the old")) {
    return "Nowe hasło musi się różnić od poprzedniego.";
  }
  if (
    t.includes("error sending") ||
    t.includes("sending confirmation") ||
    t.includes("sending recovery")
  ) {
    return "Nie udało się wysłać maila na ten adres. Sprawdź adres i spróbuj ponownie za kilka minut.";
  }
  if (t.includes("email_not_confirmed") || t.includes("not confirmed")) {
    return "Ten adres e-mail nie jest jeszcze potwierdzony. Kliknij link z maila, który wysłaliśmy przy rejestracji.";
  }
  return "Coś poszło nie tak. Spróbuj ponownie za chwilę.";
}

/** Sign in with e-mail and password. On success the Supabase client sets the session cookies. */
export async function signInWithPassword(
  supabase: SupabaseClient<Database>,
  fields: FormFields,
): Promise<AuthResult> {
  const email = text(fields.email);
  const parsed = SignInInput.safeParse({ email, password: text(fields.password) });
  if (!parsed.success) {
    return {
      ok: false,
      state: { status: "error", email, fieldErrors: firstErrors(parsed.error.issues) },
    };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    return {
      ok: false,
      state: {
        status: "error",
        email: parsed.data.email,
        message: error ? authErrorMessage(error) : "Nie udało się zalogować. Spróbuj ponownie.",
        unconfirmed: error ? isUnconfirmed(error) || undefined : undefined,
      },
    };
  }
  return { ok: true, userId: data.user.id };
}

/**
 * Create an account. With "Confirm email" switched off in Supabase the user gets a session at once
 * and no e-mail is sent. New accounts are residents; other roles are approved by ROPS later.
 */
export async function signUpWithPassword(
  supabase: SupabaseClient<Database>,
  fields: FormFields,
  emailRedirectTo?: string,
): Promise<AuthResult> {
  const email = text(fields.email);
  const parsed = SignUpInput.safeParse({
    email,
    password: text(fields.password),
    consent: fields.consent === "on" || fields.consent === "true",
  });
  if (!parsed.success) {
    return {
      ok: false,
      state: { status: "error", email, fieldErrors: firstErrors(parsed.error.issues) },
    };
  }
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // The confirmation link comes back to /auth/confirm, which also stores the consent.
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });
  if (error) {
    return {
      ok: false,
      state: { status: "error", email: parsed.data.email, message: authErrorMessage(error) },
    };
  }
  // Supabase hides existing addresses: it returns a user without identities and no session.
  if (data.user && data.user.identities?.length === 0) {
    return {
      ok: false,
      state: {
        status: "error",
        email: parsed.data.email,
        message: authErrorMessage({ code: "user_already_exists" }),
      },
    };
  }
  // "Confirm email" is on in Supabase: no session until the link in the e-mail is clicked.
  if (!data.user || !data.session) {
    return {
      ok: false,
      state: {
        status: "sent",
        email: parsed.data.email,
        message: confirmationSentMessage(parsed.data.email),
      },
    };
  }
  return { ok: true, userId: data.user.id };
}

/** Send a password-reset link. The answer is the same whether or not the account exists. */
export async function requestPasswordReset(
  supabase: SupabaseClient<Database>,
  fields: FormFields,
  redirectTo: string,
): Promise<AuthFormState> {
  const email = text(fields.email);
  const parsed = PasswordResetInput.safeParse({ email });
  if (!parsed.success) {
    return { status: "error", email, fieldErrors: firstErrors(parsed.error.issues) };
  }
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
  if (error && (error.status === 429 || /rate/i.test(error.message ?? ""))) {
    return { status: "error", email: parsed.data.email, message: authErrorMessage(error) };
  }
  return { status: "sent", email: parsed.data.email };
}

/** Set a new password for the signed-in user (after the reset link). */
export async function changePassword(
  supabase: SupabaseClient<Database>,
  fields: FormFields,
): Promise<AuthFormState | null> {
  const parsed = UpdatePasswordInput.safeParse({ password: text(fields.password) });
  if (!parsed.success) return { status: "error", fieldErrors: firstErrors(parsed.error.issues) };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorMessage(error) };
  return null;
}

/** Store the time of the consent given at sign-up (only once). */
export async function recordConsent(supabase: SupabaseClient<Database>, userId: string) {
  await supabase
    .from("profiles")
    .update({ zgoda_rodo_at: new Date().toISOString() })
    .eq("id", userId)
    .is("zgoda_rodo_at", null);
}

export function isUnconfirmed(error: { message?: string; code?: string }): boolean {
  const t = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return t.includes("email_not_confirmed") || t.includes("not confirmed");
}

export function confirmationSentMessage(email: string): string {
  return `Wysłaliśmy link na adres ${email}. Kliknij go, żeby potwierdzić konto. Sprawdź też folder Spam.`;
}

/** Sends the sign-up confirmation link again (for "Ten adres nie jest jeszcze potwierdzony"). */
export async function resendConfirmation(
  supabase: SupabaseClient<Database>,
  fields: FormFields,
  emailRedirectTo: string,
): Promise<AuthFormState> {
  const email = text(fields.email);
  const parsed = PasswordResetInput.safeParse({ email });
  if (!parsed.success) {
    return { status: "error", email, fieldErrors: firstErrors(parsed.error.issues) };
  }
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo },
  });
  if (error) {
    return {
      status: "error",
      email: parsed.data.email,
      message: authErrorMessage(error),
      unconfirmed: true,
    };
  }
  return {
    status: "sent",
    email: parsed.data.email,
    message: confirmationSentMessage(parsed.data.email),
  };
}
