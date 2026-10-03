import { describe, expect, it, vi } from "vitest";
import fixtures from "@/lib/contracts/fixtures/knowledge-base.json";
import { editInnovation, type EditClient } from "./edit";

// A database row = the card from fixtures without derived fields
const { opis_niepelny, ma_film, ma_pdf, ...row } = fixtures.innovation;
void opis_niepelny;
void ma_film;
void ma_pdf;

function fakeClient({
  user = { id: "u1" } as { id: string } | null,
  role = "rops_redaktor" as string | null,
  result = { data: row as unknown, error: null as { code?: string; message: string } | null },
} = {}) {
  const update = vi.fn(() => ({
    eq: () => ({ select: () => ({ maybeSingle: async () => result }) }),
  }));
  const client: EditClient = {
    auth: { getUser: async () => ({ data: { user } }) },
    rpc: async () => ({ data: role, error: null }),
    from: () => ({ update }),
  };
  return { client, update };
}

describe("PATCH innovation card", () => {
  it("returns 401 for an anonymous user", async () => {
    const { client, update } = fakeClient({ user: null });
    expect((await editInnovation(client, "bawita", { opis_krotki: "x" })).status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });

  it.each(["mieszkaniec", "ngo", "jst", "ekspert", null])(
    "returns 403 for role %s",
    async (role) => {
      const { client, update } = fakeClient({ role });
      expect((await editInnovation(client, "bawita", { opis_krotki: "x" })).status).toBe(403);
      expect(update).not.toHaveBeenCalled();
    },
  );

  it("a ROPS editor saves changes and gets a card matching the contract", async () => {
    const { client, update } = fakeClient();
    const result = await editInnovation(client, "bawita", {
      opis_krotki: "Nowy opis",
      sprawdzona_przez_rops: true,
    });
    expect(result.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ opis_krotki: "Nowy opis", sprawdzona_przez_rops: true });
    expect(result.body).toMatchObject({ id: "bawita", ma_film: true });
  });

  it("rejects unknown fields (e.g. changing id) with 400", async () => {
    const { client, update } = fakeClient({ role: "rops_admin" });
    expect((await editInnovation(client, "bawita", { id: "inne" })).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty change", async () => {
    const { client } = fakeClient();
    expect((await editInnovation(client, "bawita", {})).status).toBe(400);
  });

  it("returns 404 for a missing innovation", async () => {
    const { client } = fakeClient({ result: { data: null, error: null } });
    expect((await editInnovation(client, "nie-ma", { opis_krotki: "x" })).status).toBe(404);
  });

  it("returns 400 for an unknown category (foreign key)", async () => {
    const { client } = fakeClient({
      result: { data: null, error: { code: "23503", message: "fk" } },
    });
    expect((await editInnovation(client, "bawita", { kategoria_id: "zla" })).status).toBe(400);
  });

  it("logs the changed fields after a successful edit", async () => {
    const { client } = fakeClient();
    const onSaved = vi.fn(async () => 1);
    await editInnovation(client, "bawita", { opis_krotki: "x", opublikowana: false }, onSaved);
    expect(onSaved).toHaveBeenCalledWith(["opis_krotki", "opublikowana"]);
  });

  it("does not log a rejected edit", async () => {
    const { client } = fakeClient({ role: "ngo" });
    const onSaved = vi.fn(async () => 1);
    await editInnovation(client, "bawita", { opis_krotki: "x" }, onSaved);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("a failing change log does not undo a saved edit", async () => {
    const { client } = fakeClient();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await editInnovation(client, "bawita", { opis_krotki: "x" }, async () => {
      throw new Error("audit down");
    });
    expect(result.status).toBe(200);
  });
});
