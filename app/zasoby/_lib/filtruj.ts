import type { FiltryZasobow, Zasob } from "@/lib/contracts/zasobnik";

// Najnowsze na górze; filtr typu, roku i tagu
export function filtrujZasoby<T extends Zasob>(zasoby: T[], f: FiltryZasobow): T[] {
  return zasoby
    .filter((z) => !f.typ || z.typ === f.typ)
    .filter((z) => !f.rok || z.rok === f.rok)
    .filter((z) => !f.tag || z.tagi.includes(f.tag))
    .sort((a, b) => (b.rok ?? 0) - (a.rok ?? 0) || a.tytul.localeCompare(b.tytul, "pl"));
}

export function dostepneWartosci(zasoby: Zasob[]) {
  return {
    lata: [...new Set(zasoby.flatMap((z) => (z.rok ? [z.rok] : [])))].sort((a, b) => b - a),
    tagi: [...new Set(zasoby.flatMap((z) => z.tagi))].sort((a, b) => a.localeCompare(b, "pl")),
  };
}
