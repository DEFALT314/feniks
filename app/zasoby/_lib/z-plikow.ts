// Raporty i publikacje wprost z data/rops: zapas, gdy baza nie jest skonfigurowana.
import zasoby from "@/data/rops/raporty_i_publikacje.json";
import type { Zasob } from "@/lib/contracts/zasobnik";

export type ZasobZPriorytetem = Zasob & { priorytet_dla_demo: number | null };

export function zasobyZPlikow(): ZasobZPriorytetem[] {
  return [
    ...zasoby.raporty.map((r) => ({
      id: r.id,
      typ: "raport" as const,
      rok: r.rok,
      tytul: r.tytul,
      opis: null,
      tagi: r.tagi,
      url: r.url,
      priorytet_dla_demo: r.priorytet_dla_demo ?? null,
    })),
    ...zasoby.publikacje.map((p) => ({
      id: p.id,
      typ: "publikacja" as const,
      rok: p.rok,
      tytul: p.tytul,
      opis: p.opis ?? null,
      tagi: [],
      url: p.url,
      priorytet_dla_demo: null,
    })),
  ];
}
