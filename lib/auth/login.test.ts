import { describe, expect, it } from "vitest";
import { authErrorMessage, confirmLoginCode, recordConsent, requestLoginCode } from "./login";
import { mockAuthClient } from "./supabase-auth-mock";

const REDIRECT = "https://feniks-hub.vercel.app/auth/confirm?next=%2F";

describe("requestLoginCode", () => {
  it("sends a code to a normalized address and creates the account if needed", async () => {
    const { client, auth } = mockAuthClient({});

    const state = await requestLoginCode(
      client,
      { email: " Anna@Example.org ", consent: "on" },
      REDIRECT,
    );

    expect(state).toEqual({ status: "code-sent", email: "anna@example.org" });
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: "anna@example.org",
      options: { shouldCreateUser: true, emailRedirectTo: REDIRECT },
    });
  });

  it("requires consent and a valid e-mail before calling Supabase", async () => {
    const { client, auth } = mockAuthClient({});

    const state = await requestLoginCode(client, { email: "anna@" }, REDIRECT);

    expect(state.status).toBe("error");
    expect(state.fieldErrors?.email).toBeDefined();
    expect(state.fieldErrors?.consent).toBeDefined();
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("shows a friendly message when Supabase rate-limits e-mails", async () => {
    const { client } = mockAuthClient({
      signInWithOtp: { error: { status: 429, message: "Email rate limit exceeded" } },
    });

    const state = await requestLoginCode(
      client,
      { email: "anna@example.org", consent: "on" },
      REDIRECT,
    );

    expect(state.status).toBe("error");
    expect(state.message).toMatch(/Odczekaj/);
  });
});

describe("confirmLoginCode", () => {
  it("verifies a 6-digit code as an e-mail OTP", async () => {
    const { client, auth } = mockAuthClient({ verifyOtp: { data: { user: { id: "u1" } } } });

    const result = await confirmLoginCode(client, { email: "anna@example.org", code: "482913" });

    expect(result).toEqual({ ok: true, userId: "u1" });
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: "anna@example.org",
      token: "482913",
      type: "email",
    });
  });

  it("rejects a malformed code without calling Supabase", async () => {
    const { client, auth } = mockAuthClient({});

    const result = await confirmLoginCode(client, { email: "anna@example.org", code: "12" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.state.fieldErrors?.code).toMatch(/6 cyfr/);
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("keeps the user on the code step when the code is wrong or expired", async () => {
    const { client } = mockAuthClient({
      verifyOtp: { error: { message: "Token has expired or is invalid" } },
    });

    const result = await confirmLoginCode(client, { email: "anna@example.org", code: "000000" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.state.status).toBe("code-sent");
      expect(result.state.fieldErrors?.code).toMatch(/wygasł/);
    }
  });
});

describe("recordConsent", () => {
  it("sets zgoda_rodo_at only when it is still empty", async () => {
    const { client, from, query } = mockAuthClient({});

    await recordConsent(client, "u1");

    expect(from).toHaveBeenCalledWith("profiles");
    expect(query.update).toHaveBeenCalledWith({ zgoda_rodo_at: expect.any(String) });
    expect(query.eq).toHaveBeenCalledWith("id", "u1");
    expect(query.is).toHaveBeenCalledWith("zgoda_rodo_at", null);
  });
});

describe("authErrorMessage", () => {
  it("maps unknown errors to a generic message", () => {
    expect(authErrorMessage({ message: "boom" })).toMatch(/Spróbuj ponownie/);
  });
});
