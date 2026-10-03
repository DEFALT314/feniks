import { describe, expect, it, vi } from "vitest";
import fixtures from "@/lib/contracts/fixtures/zasobnik.json";
import { edytujInnowacje, type KlientEdycji } from "./edycja";

// Wiersz z bazy = karta z fixtures bez pól pochodnych
const { opis_niepelny, ma_film, ma_pdf, ...wiersz } = fixtures.innowacja;
void opis_niepelny;
void ma_film;
void ma_pdf;

function atrapa({
  user = { id: "u1" } as { id: string } | null,
  rola = "rops_redaktor" as string | null,
  wynik = { data: wiersz as unknown, error: null as { code?: string; message: string } | null },
} = {}) {
  const update = vi.fn(() => ({
    eq: () => ({ select: () => ({ maybeSingle: async () => wynik }) }),
  }));
  const klient: KlientEdycji = {
    auth: { getUser: async () => ({ data: { user } }) },
    rpc: async () => ({ data: rola, error: null }),
    from: () => ({ update }),
  };
  return { klient, update };
}

describe("PATCH karty innowacji", () => {
  it("niezalogowany dostaje 401", async () => {
    const { klient, update } = atrapa({ user: null });
    expect((await edytujInnowacje(klient, "bawita", { opis_krotki: "x" })).status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });

  it.each(["mieszkaniec", "ngo", "jst", "ekspert", null])("rola %s dostaje 403", async (rola) => {
    const { klient, update } = atrapa({ rola });
    expect((await edytujInnowacje(klient, "bawita", { opis_krotki: "x" })).status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("redaktor ROPS zapisuje zmiany i dostaje kartę zgodną z kontraktem", async () => {
    const { klient, update } = atrapa();
    const wynik = await edytujInnowacje(klient, "bawita", {
      opis_krotki: "Nowy opis",
      sprawdzona_przez_rops: true,
    });
    expect(wynik.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ opis_krotki: "Nowy opis", sprawdzona_przez_rops: true });
    expect(wynik.body).toMatchObject({ id: "bawita", ma_film: true });
  });

  it("odrzuca nieznane pola (np. zmianę id) z 400", async () => {
    const { klient, update } = atrapa({ rola: "rops_admin" });
    expect((await edytujInnowacje(klient, "bawita", { id: "inne" })).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("pusta zmiana to 400", async () => {
    const { klient } = atrapa();
    expect((await edytujInnowacje(klient, "bawita", {})).status).toBe(400);
  });

  it("brak innowacji to 404", async () => {
    const { klient } = atrapa({ wynik: { data: null, error: null } });
    expect((await edytujInnowacje(klient, "nie-ma", { opis_krotki: "x" })).status).toBe(404);
  });

  it("nieznana kategoria (klucz obcy) to 400", async () => {
    const { klient } = atrapa({ wynik: { data: null, error: { code: "23503", message: "fk" } } });
    expect((await edytujInnowacje(klient, "bawita", { kategoria_id: "zla" })).status).toBe(400);
  });
});
