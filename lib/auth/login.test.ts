import { describe, expect, it } from "vitest";
import {
  authErrorMessage,
  changePassword,
  recordConsent,
  requestPasswordReset,
  signInWithPassword,
  signUpWithPassword,
} from "./login";
import { mockAuthClient } from "./supabase-auth-mock";

const RESET_REDIRECT = "https://hubmi.example/auth/confirm?next=%2Fupdate-password";

describe("signInWithPassword", () => {
  it("signs in with a normalized address", async () => {
    const { client, auth } = mockAuthClient({
      signInWithPassword: { data: { user: { id: "u1" } } },
    });

    const result = await signInWithPassword(client, {
      email: " Anna@Example.org ",
      password: "dlugie haslo 123",
    });

    expect(result).toEqual({ ok: true, userId: "u1" });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "anna@example.org",
      password: "dlugie haslo 123",
    });
  });

  it("validates the form before calling Supabase", async () => {
    const { client, auth } = mockAuthClient({});

    const result = await signInWithPassword(client, { email: "anna@", password: "" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.state.fieldErrors?.email).toBeDefined();
      expect(result.state.fieldErrors?.password).toBeDefined();
    }
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("shows one message for a wrong e-mail or password", async () => {
    const { client } = mockAuthClient({
      signInWithPassword: {
        error: { code: "invalid_credentials", message: "Invalid login credentials", status: 400 },
      },
    });

    const result = await signInWithPassword(client, {
      email: "anna@example.org",
      password: "zle haslo",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.state.message).toBe("Nieprawidłowy e-mail lub hasło.");
  });
});

describe("signUpWithPassword", () => {
  const valid = { email: "anna@example.org", password: "mój kot lubi mleko", consent: "on" };

  it("creates an account and returns the session user", async () => {
    const { client, auth } = mockAuthClient({
      signUp: { data: { user: { id: "u2", identities: [{}] }, session: { access_token: "t" } } },
    });

    const result = await signUpWithPassword(client, valid);

    expect(result).toEqual({ ok: true, userId: "u2" });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "anna@example.org",
      password: "mój kot lubi mleko",
    });
  });

  it("requires consent and a password of at least 10 characters", async () => {
    const { client, auth } = mockAuthClient({});

    const result = await signUpWithPassword(client, {
      email: "anna@example.org",
      password: "krotkie",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.state.fieldErrors?.password).toMatch(/10 znaków/);
      expect(result.state.fieldErrors?.consent).toBeDefined();
    }
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("tells the user when the address already has an account", async () => {
    const { client } = mockAuthClient({
      signUp: { data: { user: { id: "u3", identities: [] }, session: null } },
    });

    const result = await signUpWithPassword(client, valid);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.state.message).toMatch(/już istnieje/);
  });

  it("explains when Supabase still requires e-mail confirmation", async () => {
    const { client } = mockAuthClient({
      signUp: { data: { user: { id: "u4", identities: [{}] }, session: null } },
    });

    const result = await signUpWithPassword(client, valid);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.state.message).toMatch(/potwierdzenia/);
  });
});

describe("requestPasswordReset", () => {
  it("sends a reset link and answers the same way for any address", async () => {
    const { client, auth } = mockAuthClient({});

    const state = await requestPasswordReset(client, { email: "Anna@Example.org" }, RESET_REDIRECT);

    expect(state).toEqual({ status: "sent", email: "anna@example.org" });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("anna@example.org", {
      redirectTo: RESET_REDIRECT,
    });
  });

  it("reports rate limits", async () => {
    const { client } = mockAuthClient({
      resetPasswordForEmail: { error: { status: 429, message: "Email rate limit exceeded" } },
    });

    const state = await requestPasswordReset(client, { email: "anna@example.org" }, RESET_REDIRECT);

    expect(state.status).toBe("error");
    expect(state.message).toMatch(/Odczekaj/);
  });
});

describe("changePassword", () => {
  it("updates the password of the signed-in user", async () => {
    const { client, auth } = mockAuthClient({});

    const state = await changePassword(client, { password: "nowe dlugie haslo" });

    expect(state).toBeNull();
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "nowe dlugie haslo" });
  });

  it("rejects a too short password", async () => {
    const { client, auth } = mockAuthClient({});

    const state = await changePassword(client, { password: "krotkie" });

    expect(state?.fieldErrors?.password).toBeDefined();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});

describe("authErrorMessage", () => {
  it("maps Supabase errors to Polish messages", () => {
    expect(authErrorMessage({ status: 429 })).toMatch(/Odczekaj/);
    expect(authErrorMessage({ code: "user_already_exists" })).toMatch(/już istnieje/);
    expect(authErrorMessage({ code: "weak_password" })).toMatch(/dłuższe/);
    expect(authErrorMessage({ message: "boom" })).toMatch(/Spróbuj ponownie/);
  });
});

describe("recordConsent", () => {
  it("stores the consent time only once", async () => {
    const { client, from, query } = mockAuthClient({});

    await recordConsent(client, "u1");

    expect(from).toHaveBeenCalledWith("profiles");
    expect(query.eq).toHaveBeenCalledWith("id", "u1");
    expect(query.is).toHaveBeenCalledWith("zgoda_rodo_at", null);
  });
});
