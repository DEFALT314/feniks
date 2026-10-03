import { describe, expect, it } from "vitest";
import { mockAuthClient } from "@/lib/auth/supabase-auth-mock";
import { saveDisplayName } from "./profile";

describe("saveDisplayName", () => {
  it("saves a trimmed name on the user's own profile", async () => {
    const { client, from, query } = mockAuthClient({});

    const state = await saveDisplayName(client, "u1", { name: "  Stanisław " });

    expect(state.status).toBe("saved");
    expect(from).toHaveBeenCalledWith("profiles");
    expect(query.update).toHaveBeenCalledWith({ nazwa_wyswietlana: "Stanisław" });
    expect(query.eq).toHaveBeenCalledWith("id", "u1");
  });

  it("rejects a name that is too short", async () => {
    const { client, query } = mockAuthClient({});

    const state = await saveDisplayName(client, "u1", { name: "S" });

    expect(state).toEqual({ status: "error", fieldError: "Wpisz co najmniej 2 znaki." });
    expect(query.update).not.toHaveBeenCalled();
  });
});
