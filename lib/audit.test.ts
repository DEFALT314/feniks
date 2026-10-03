import { describe, expect, it, vi } from "vitest";
import { writeAudit } from "./audit";
import { mockRpcClient } from "./test/supabase-mock";

vi.mock("server-only", () => ({}));

describe("writeAudit", () => {
  it("writes an entry through the zapisz_audit rpc and returns its id", async () => {
    const { client, rpc } = mockRpcClient({ data: 42 });

    const id = await writeAudit(
      { akcja: "pomysl.ocena", obiekt: "ideas:123", szczegoly: { status: "zatwierdzony" } },
      client,
    );

    expect(id).toBe(42);
    expect(rpc).toHaveBeenCalledWith("zapisz_audit", {
      p_akcja: "pomysl.ocena",
      p_obiekt: "ideas:123",
      p_szczegoly: { status: "zatwierdzony" },
    });
  });

  it("sends an empty object when there are no details", async () => {
    const { client, rpc } = mockRpcClient({ data: 1 });

    await writeAudit({ akcja: "profil.rola", obiekt: "profiles:abc" }, client);

    expect(rpc).toHaveBeenCalledWith("zapisz_audit", expect.objectContaining({ p_szczegoly: {} }));
  });

  it("rejects an empty action before calling the database", async () => {
    const { client, rpc } = mockRpcClient({ data: 1 });

    await expect(writeAudit({ akcja: "", obiekt: "ideas:1" }, client)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("turns a database error into a readable exception", async () => {
    const { client } = mockRpcClient({ error: { message: "Wymagane logowanie" } });

    await expect(writeAudit({ akcja: "a", obiekt: "b" }, client)).rejects.toThrow(
      "Failed to write audit log: Wymagane logowanie",
    );
  });
});
