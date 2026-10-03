import { describe, expect, it } from "vitest";
import { mockAuthClient } from "@/lib/auth/supabase-auth-mock";
import { clearRoleRequest, saveDisplayName, saveRoleRequest } from "./profile";

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

describe("saveRoleRequest", () => {
  it("stores the requested role for ROPS to approve", async () => {
    const { client, query } = mockAuthClient({});

    const state = await saveRoleRequest(client, "u1", { role: "jst" });

    expect(state.status).toBe("saved");
    expect(query.update).toHaveBeenCalledWith({ wnioskowana_rola: "jst" });
  });

  it("does not accept ROPS roles", async () => {
    const { client, query } = mockAuthClient({});

    const state = await saveRoleRequest(client, "u1", { role: "rops_admin" });

    expect(state.status).toBe("error");
    expect(query.update).not.toHaveBeenCalled();
  });
});

describe("clearRoleRequest", () => {
  it("removes the pending request", async () => {
    const { client, query } = mockAuthClient({});

    await clearRoleRequest(client, "u1");

    expect(query.update).toHaveBeenCalledWith({ wnioskowana_rola: null });
  });
});
