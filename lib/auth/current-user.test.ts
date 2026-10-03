import { describe, expect, it } from "vitest";
import { headerName, loadCurrentUser } from "./current-user";
import { mockAuthClient } from "./supabase-auth-mock";

const USER = { id: "00000000-0000-4000-8000-0000000000a1", email: "anna@example.org" };

describe("loadCurrentUser", () => {
  it("returns null when nobody is signed in", async () => {
    const { client, from } = mockAuthClient({ user: null });
    expect(await loadCurrentUser(client)).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("returns null when the session cannot be validated", async () => {
    const { client } = mockAuthClient({ user: USER, getUserError: new Error("bad jwt") });
    expect(await loadCurrentUser(client)).toBeNull();
  });

  it("combines the auth user with the profile", async () => {
    const { client, from, query } = mockAuthClient({
      user: USER,
      profile: {
        role: "rops_admin",
        nazwa_wyswietlana: "Redakcja ROPS",
        instytucja_id: null,
        zgoda_rodo_at: "2026-10-03T16:00:00Z",
      },
    });

    expect(await loadCurrentUser(client)).toEqual({
      id: USER.id,
      email: USER.email,
      role: "rops_admin",
      displayName: "Redakcja ROPS",
      institutionId: null,
      consentAt: "2026-10-03T16:00:00Z",
    });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(query.eq).toHaveBeenCalledWith("id", USER.id);
  });

  it("falls back to the lowest role when the profile is missing or the role is unknown", async () => {
    const missing = mockAuthClient({ user: USER, profile: null });
    expect((await loadCurrentUser(missing.client))?.role).toBe("mieszkaniec");

    const unknown = mockAuthClient({ user: USER, profile: { role: "superuser" } });
    expect((await loadCurrentUser(unknown.client))?.role).toBe("mieszkaniec");
  });
});

describe("headerName", () => {
  const base = { id: "x", role: "mieszkaniec" as const, institutionId: null, consentAt: null };

  it("prefers the display name, then the e-mail local part", () => {
    expect(headerName({ ...base, email: "anna@example.org", displayName: "Anna" })).toBe("Anna");
    expect(headerName({ ...base, email: "anna@example.org", displayName: null })).toBe("anna");
    expect(headerName({ ...base, email: null, displayName: null })).toBe("Użytkownik");
  });
});
