import { describe, expect, it } from "vitest";
import { FiltryZasobow, Zasob } from "@/lib/contracts/zasobnik";
import { dostepneWartosci, filtrujZasoby } from "./filtruj";
import { zasobyZPlikow } from "./z-plikow";

const zasoby = zasobyZPlikow();
const f = (p: Record<string, unknown> = {}) => FiltryZasobow.parse(p);

describe("Zasoby", () => {
  it("pliki dają 51 raportów i 6 publikacji zgodnych z kontraktem", () => {
    expect(zasoby.filter((z) => z.typ === "raport")).toHaveLength(51);
    expect(zasoby.filter((z) => z.typ === "publikacja")).toHaveLength(6);
    expect(Zasob.array().safeParse(zasoby).success).toBe(true);
  });

  it("bez filtrów najnowsze są na górze", () => {
    const lista = filtrujZasoby(zasoby, f());
    expect(lista).toHaveLength(57);
    expect(lista[0].rok).toBe(Math.max(...zasoby.map((z) => z.rok ?? 0)));
  });

  it("filtruje po typie, roku i tagu naraz", () => {
    const lista = filtrujZasoby(zasoby, f({ typ: "raport", tag: "seniorzy" }));
    expect(lista.length).toBeGreaterThan(0);
    expect(lista.every((z) => z.typ === "raport" && z.tagi.includes("seniorzy"))).toBe(true);
    const rok = lista[0].rok!;
    expect(filtrujZasoby(zasoby, f({ rok: String(rok) })).every((z) => z.rok === rok)).toBe(true);
  });

  it("lata malejąco, tagi bez powtórzeń", () => {
    const { lata, tagi } = dostepneWartosci(zasoby);
    expect([...lata].sort((a, b) => b - a)).toEqual(lata);
    expect(new Set(tagi).size).toBe(tagi.length);
  });
});
