// Reports and publications straight from data/rops: a fallback when the database is not configured.
import source from "@/data/rops/raporty_i_publikacje.json";
import type { Resource } from "@/lib/contracts/knowledge-base";

export type ResourceWithPriority = Resource & { priorytet_dla_demo: number | null };

export function resourcesFromFiles(): ResourceWithPriority[] {
  return [
    ...source.raporty.map((r) => ({
      id: r.id,
      typ: "raport" as const,
      rok: r.rok,
      tytul: r.tytul,
      opis: null,
      tagi: r.tagi,
      url: r.url,
      priorytet_dla_demo: r.priorytet_dla_demo ?? null,
    })),
    ...source.publikacje.map((p) => ({
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
