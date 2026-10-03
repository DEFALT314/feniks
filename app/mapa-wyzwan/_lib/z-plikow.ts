// Mapa Wyzwań wprost z data/rops: zapas, gdy baza nie jest skonfigurowana. Te same reguły co build_seed.ts.
import mapa from "@/data/rops/mapa_wyzwan.json";
import type { Obszar, Persona, Wyzwanie } from "@/lib/contracts/zasobnik";

export type ObszarPelny = Obszar & { wyzwania: Wyzwanie[]; persony: Persona[] };

type PersonaPlik = {
  imie: string;
  opis: string;
  cele: string[];
  wyzwania: string[];
  motywacje: string[];
};

export function obszaryZPlikow(): ObszarPelny[] {
  return mapa.obszary.map((o) => {
    const persony = [o.persona as PersonaPlik | PersonaPlik[]].flat();
    return {
      id: o.id,
      nr: o.nr,
      nazwa: o.nazwa,
      definicja: o.definicja,
      dane: o.dane,
      slowa_kluczowe: o.slowa_kluczowe,
      kategorie_biblioteki: o.kategorie_biblioteki,
      zrodlo_url: mapa.zrodlo,
      wyzwania: o.kluczowe_wyzwania.map((w) => ({ id: w.id, obszar_id: o.id, tekst: w.tekst })),
      persony: persony.map((p, n) => ({
        id: persony.length > 1 ? `persona-${o.id}-${n + 1}` : `persona-${o.id}`,
        obszar_id: o.id,
        imie: p.imie,
        opis: p.opis,
        cele: p.cele,
        wyzwania: p.wyzwania,
        motywacje: p.motywacje,
      })),
    };
  });
}
