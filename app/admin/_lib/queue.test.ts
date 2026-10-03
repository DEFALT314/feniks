import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { loadIdeaQueue } from "./queue";

const IDEAS = [
  {
    id: "i1",
    tytul: "A",
    istota: null,
    opis: null,
    dla_kogo: null,
    etap: null,
    obszar_id: "seniorzy",
    wyslany_at: "2026-10-03T16:00:00Z",
    autor_id: "u1",
    challenge_areas: { nazwa: "Seniorzy" },
  },
  {
    id: "i2",
    tytul: "B",
    istota: null,
    opis: null,
    dla_kogo: null,
    etap: null,
    obszar_id: null,
    wyslany_at: "2026-10-03T15:00:00Z",
    autor_id: "u2",
    challenge_areas: null,
  },
];

function client() {
  const chain = (data: unknown) => {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "not", "order", "eq"]) q[m] = vi.fn(() => q);
    q.limit = vi.fn(async () => ({ data, error: null }));
    q.in = vi.fn(async () => ({ data, error: null }));
    return q;
  };
  const from = vi.fn((table: string) => {
    if (table === "ideas") return chain(IDEAS);
    if (table === "profiles") return chain([{ id: "u1", nazwa_wyswietlana: "Fundacja" }]);
    return chain([{ idea_id: "i1", status: "zatwierdzony", komentarz: null, ekspert_id: null }]);
  });
  return { from } as unknown as SupabaseClient<Database>;
}

describe("loadIdeaQueue", () => {
  it("joins author names, areas and statuses; no review means nowy", async () => {
    const rows = await loadIdeaQueue(client(), "all");
    expect(rows).toEqual([
      expect.objectContaining({
        idea_id: "i1",
        autor_nazwa: "Fundacja",
        obszar_nazwa: "Seniorzy",
        status: "zatwierdzony",
      }),
      expect.objectContaining({
        idea_id: "i2",
        autor_nazwa: null,
        obszar_nazwa: null,
        status: "nowy",
      }),
    ]);
  });

  it("filters the open queue and single statuses", async () => {
    expect((await loadIdeaQueue(client(), "open")).map((r) => r.idea_id)).toEqual(["i2"]);
    expect((await loadIdeaQueue(client(), "zatwierdzony")).map((r) => r.idea_id)).toEqual(["i1"]);
  });
});
