import { describe, expect, it, vi } from "vitest";
import { newCardRow } from "@/app/admin/library/_lib/new-card";
import { innovationsFromRows } from "./row";

const dbRow = (over: Record<string, unknown> = {}) => ({
  ...newCardRow({ nazwa: "Sąsiedzka pomoc", kategoria_id: "dla-seniorow" }, "ab12"),
  etykieta: null,
  opis_krotki: null,
  problem: null,
  dla_kogo: [],
  kto_moze_wdrozyc: [],
  czy_dziala: null,
  slowa_kluczowe: [],
  spoza_biblioteki: false,
  program: null,
  zrodlo: null,
  pewnosc: null,
  updated_at: "2026-10-04T00:00:00.000Z",
  ...over,
});

describe("innovationsFromRows", () => {
  it("reads a card created in the ROPS panel", () => {
    const [card] = innovationsFromRows([dbRow()]);
    expect(card).toMatchObject({ id: "sasiedzka-pomoc-ab12", ma_film: false, opublikowana: false });
  });

  it("skips a broken row instead of failing the whole Library", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cards = innovationsFromRows([dbRow({ id: "zla", materialy: {} }), dbRow()]);
    expect(cards.map((c) => c.id)).toEqual(["sasiedzka-pomoc-ab12"]);
  });
});
