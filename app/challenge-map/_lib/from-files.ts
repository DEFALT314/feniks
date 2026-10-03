// The Challenges Map straight from data/rops: a fallback when the database is not configured. Same rules as build_seed.ts.
import map from "@/data/rops/mapa_wyzwan.json";
import type { ChallengeArea, Persona, Challenge } from "@/lib/contracts/knowledge-base";

export type FullChallengeArea = ChallengeArea & { wyzwania: Challenge[]; persony: Persona[] };

type SourcePersona = {
  imie: string;
  opis: string;
  cele: string[];
  wyzwania: string[];
  motywacje: string[];
};

export function challengeAreasFromFiles(): FullChallengeArea[] {
  return map.obszary.map((o) => {
    const personas = [o.persona as SourcePersona | SourcePersona[]].flat();
    return {
      id: o.id,
      nr: o.nr,
      nazwa: o.nazwa,
      definicja: o.definicja,
      dane: o.dane,
      slowa_kluczowe: o.slowa_kluczowe,
      kategorie_biblioteki: o.kategorie_biblioteki,
      zrodlo_url: map.zrodlo,
      wyzwania: o.kluczowe_wyzwania.map((w) => ({ id: w.id, obszar_id: o.id, tekst: w.tekst })),
      persony: personas.map((p, n) => ({
        id: personas.length > 1 ? `persona-${o.id}-${n + 1}` : `persona-${o.id}`,
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
