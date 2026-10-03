import { describe, expect, it } from "vitest";
import { obszaryZPlikow } from "@/app/mapa-wyzwan/_lib/z-plikow";
import { innowacjeZPlikow } from "./z-plikow";
import { podobneInnowacje, wyzwaniaDlaInnowacji } from "./powiazania";

const katalog = innowacjeZPlikow();
const obszary = obszaryZPlikow();
const karta = (id: string) => katalog.find((i) => i.id === id)!;

describe("powiązania na karcie", () => {
  it("podobne nie zawierają samej innowacji ani opisów niepełnych", () => {
    for (const i of katalog.slice(0, 40)) {
      const podobne = podobneInnowacje(i, katalog);
      expect(podobne.length).toBeLessThanOrEqual(3);
      expect(podobne.some((p) => p.id === i.id || p.opis_niepelny)).toBe(false);
    }
  });

  it("Merkury łączy się z wyzwaniem o kompetencjach cyfrowych seniorów", () => {
    const wyzwania = wyzwaniaDlaInnowacji(karta("merkury"), obszary);
    expect(wyzwania[0].obszar.id).toBe("seniorzy");
    expect(wyzwania.map((w) => w.wyzwanie.tekst).join(" ")).toMatch(/cyfrow/i);
  });

  it("wyzwania pochodzą tylko z obszarów powiązanych z kategorią innowacji", () => {
    const i = karta("bawita");
    for (const { obszar } of wyzwaniaDlaInnowacji(i, obszary)) {
      expect(obszar.kategorie_biblioteki).toContain(i.kategoria_id);
    }
  });

  it("Mapa z plików ma 8 obszarów, 48 wyzwań i 9 person", () => {
    expect(obszary).toHaveLength(8);
    expect(obszary.flatMap((o) => o.wyzwania)).toHaveLength(48);
    expect(obszary.flatMap((o) => o.persony)).toHaveLength(9);
  });
});
