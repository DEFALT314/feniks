// Powiązania na karcie innowacji: podobne innowacje i wyzwania z Mapy Wyzwań (bez AI, po słowach).
import type { Innowacja, Obszar, Wyzwanie } from "@/lib/contracts/zasobnik";
import { normalizuj, rdzen } from "./szukaj";

const rdzenie = (teksty: (string | null)[]): Set<string> =>
  new Set(
    teksty
      .flatMap((t) => normalizuj(t ?? "").split(" "))
      .filter((s) => s.length >= 4)
      .map(rdzen),
  );

const wspolne = (a: Set<string>, b: Set<string>) => [...a].filter((x) => b.has(x)).length;

const slowaInnowacji = (i: Innowacja) => rdzenie([...i.slowa_kluczowe, ...i.dla_kogo]);

export function podobneInnowacje(i: Innowacja, katalog: Innowacja[], ile = 3): Innowacja[] {
  const moje = slowaInnowacji(i);
  return katalog
    .filter((x) => x.id !== i.id && x.opublikowana && !x.opis_niepelny)
    .map((x) => ({
      x,
      punkty: wspolne(moje, slowaInnowacji(x)) + (x.kategoria_id === i.kategoria_id ? 1 : 0),
    }))
    .filter(({ punkty }) => punkty >= 2)
    .sort(
      (a, b) =>
        b.punkty - a.punkty ||
        Number(b.x.sprawdzona_przez_rops) - Number(a.x.sprawdzona_przez_rops) ||
        a.x.nazwa.localeCompare(b.x.nazwa, "pl"),
    )
    .slice(0, ile)
    .map(({ x }) => x);
}

export type WyzwanieZObszarem = { obszar: Obszar; wyzwanie: Wyzwanie };

// Wyzwania z obszarów powiązanych z kategorią innowacji, uszeregowane po wspólnych słowach
export function wyzwaniaDlaInnowacji(
  i: Innowacja,
  obszary: (Obszar & { wyzwania: Wyzwanie[] })[],
  ile = 3,
): WyzwanieZObszarem[] {
  const moje = rdzenie([...i.slowa_kluczowe, ...i.dla_kogo, i.opis_krotki, i.problem]);
  return obszary
    .filter((o) => o.kategorie_biblioteki.includes(i.kategoria_id))
    .flatMap((obszar) =>
      obszar.wyzwania.map((wyzwanie) => ({
        obszar,
        wyzwanie,
        punkty: wspolne(moje, rdzenie([wyzwanie.tekst])),
      })),
    )
    .filter(({ punkty }) => punkty > 0)
    .sort((a, b) => b.punkty - a.punkty)
    .slice(0, ile)
    .map(({ obszar, wyzwanie }) => ({ obszar, wyzwanie }));
}
