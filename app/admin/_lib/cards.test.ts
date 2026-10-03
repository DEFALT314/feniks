import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { loadSentCard, loadSentCards } from "./cards";

const ROW = {
  id: "c1",
  owner_id: "u1",
  innovation_id: "organizator-kompleksowej-opieki",
  institution: {
    type: "gops",
    name: "GOPS w Przykładowej Woli",
    municipality_kind: "wiejska",
    staff: "Dwie pracownice",
  },
  card: {
    title: "Pomoc po szpitalu",
    for_whom: "Seniorzy po wypisie",
    how_it_works: ["Zgłoszenie", "Plan opieki"],
    who_delivers: "GOPS",
    cost: { estimate: null, funding_hint: "Sprawdź nabory." },
    risks: "Brak transportu",
    first_steps: ["Rozmowa z OPS"],
  },
  version: 2,
  updated_at: "2026-10-03T18:00:00Z",
  innovations: { nazwa: "Organizator kompleksowej opieki" },
};

function client(rows: unknown[]) {
  const eqCalls: unknown[][] = [];
  const q: Record<string, unknown> = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn((...a: unknown[]) => {
    eqCalls.push(a);
    return q;
  });
  q.order = vi.fn(() => q);
  q.limit = vi.fn(async () => ({ data: rows, error: null }));
  q.maybeSingle = vi.fn(async () => ({ data: rows[0] ?? null }));
  q.in = vi.fn(async () => ({ data: [{ id: "u1", nazwa_wyswietlana: "GOPS (konto)" }] }));
  return { c: { from: vi.fn(() => q) } as unknown as SupabaseClient<Database>, eqCalls };
}

describe("service cards in the ROPS panel", () => {
  it("lists only sent cards with institution and owner names", async () => {
    const { c, eqCalls } = client([ROW]);
    expect(await loadSentCards(c)).toEqual([
      expect.objectContaining({
        id: "c1",
        title: "Pomoc po szpitalu",
        institution: "GOPS w Przykładowej Woli",
        innovationName: "Organizator kompleksowej opieki",
        ownerName: "GOPS (konto)",
      }),
    ]);
    expect(eqCalls).toContainEqual(["status", "wyslana_do_rops"]);
  });

  it("reads the card sections and tolerates missing fields", async () => {
    const card = await loadSentCard(client([ROW]).c, "c1");
    expect(card).toMatchObject({
      version: 2,
      howItWorks: ["Zgłoszenie", "Plan opieki"],
      costEstimate: null,
      fundingHint: "Sprawdź nabory.",
      profile: expect.objectContaining({ staff: "Dwie pracownice" }),
    });
    const broken = await loadSentCard(
      client([{ ...ROW, card: { title: 3 }, institution: {} }]).c,
      "c1",
    );
    expect(broken).toMatchObject({
      title: "Karta usługi",
      institution: "Instytucja",
      howItWorks: [],
      profile: null,
    });
  });

  it("returns null for a draft or a missing card", async () => {
    expect(await loadSentCard(client([]).c, "nope")).toBeNull();
  });
});
