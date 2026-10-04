import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { createInnovationTest, loadReviewedInnovations, loadTests, polishOffset } from "./tests";

describe("loadTests", () => {
  it("adds seats taken, average and the number of improvement proposals", async () => {
    const tests = [
      {
        id: "t1",
        tytul: "Merkury",
        termin: null,
        miejsce: null,
        liczba_miejsc: 20,
        innowacja_id: "merkury",
        idea_id: null,
        innovations: { nazwa: "Merkury" },
        ideas: null,
      },
      {
        id: "t2",
        tytul: "Kawiarenka",
        termin: null,
        miejsce: null,
        liczba_miejsc: null,
        innowacja_id: null,
        idea_id: "i1",
        innovations: null,
        ideas: { tytul: "Kawiarenka" },
      },
    ];
    const ratings = [
      { test_id: "t1", ocena: 5, co_poprawic: "Tablet" },
      { test_id: "t1", ocena: 4, co_poprawic: "  " },
    ];
    const from = vi.fn((table: string) => {
      const q: Record<string, unknown> = {};
      q.select = vi.fn(() => q);
      q.order = vi.fn(() => q);
      q.limit = vi.fn(async () => ({ data: tests, error: null }));
      q.in = vi.fn(async () => ({ data: table === "test_ratings" ? ratings : [] }));
      return q;
    });
    const rpc = vi.fn(async () => ({ data: [{ test_id: "t1", zajete: 7 }] }));
    const rows = await loadTests({ from, rpc } as unknown as SupabaseClient<Database>);
    expect(rows[0]).toMatchObject({
      subject: "Merkury",
      zajete: 7,
      ratings: 2,
      average: 4.5,
      proposals: 1,
    });
    expect(rows[1]).toMatchObject({
      subject: "pomysł: Kawiarenka",
      zajete: 0,
      ratings: 0,
      average: null,
    });
  });
});

describe("loadReviewedInnovations", () => {
  it("groups reviews by innovation", async () => {
    const data = [
      {
        innowacja_id: "merkury",
        ocena: 5,
        co_poprawic: "Tablet",
        updated_at: "2026-10-04T08:00:00Z",
        innovations: { nazwa: "Merkury" },
      },
      {
        innowacja_id: "merkury",
        ocena: 4,
        co_poprawic: null,
        updated_at: "2026-10-03T08:00:00Z",
        innovations: { nazwa: "Merkury" },
      },
    ];
    const q: Record<string, unknown> = {};
    q.select = vi.fn(() => q);
    q.order = vi.fn(() => q);
    q.limit = vi.fn(async () => ({ data }));
    const rows = await loadReviewedInnovations({
      from: vi.fn(() => q),
    } as unknown as SupabaseClient<Database>);
    expect(rows).toEqual([
      {
        innowacja_id: "merkury",
        nazwa: "Merkury",
        count: 2,
        average: 4.5,
        proposals: 1,
        latest: "2026-10-04T08:00:00Z",
      },
    ]);
  });
});

describe("createInnovationTest", () => {
  function client() {
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: "t9" }, error: null })) })),
    }));
    return {
      c: { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient<Database>,
      insert,
    };
  }
  const form = (f: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(f)) fd.append(k, v);
    return fd;
  };

  it("creates a test of a Library innovation in Polish time and logs it", async () => {
    const { c, insert } = client();
    const audit = vi.fn(async () => 1);
    const state = await createInnovationTest(
      c,
      audit,
      form({
        innowacja_id: "merkury",
        tytul: "Merkury w klubie seniora",
        termin: "2026-10-12T17:00",
        liczba_miejsc: "10",
      }),
    );
    expect(state).toMatchObject({ status: "saved", id: "t9" });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        innowacja_id: "merkury",
        termin: "2026-10-12T15:00:00.000Z",
        liczba_miejsc: 10,
      }),
    );
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ akcja: "test.dodanie" }));
  });

  it("validates the innovation and the name", async () => {
    const { c, insert } = client();
    const state = await createInnovationTest(c, vi.fn(), form({ tytul: "x" }));
    expect(state.fieldErrors).toMatchObject({
      innowacja_id: expect.any(String),
      tytul: expect.any(String),
    });
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("polishOffset", () => {
  it("follows summer and winter time", () => {
    expect(polishOffset("2026-07-01T12:00")).toBe("+02:00");
    expect(polishOffset("2026-12-01T12:00")).toBe("+01:00");
  });
});
