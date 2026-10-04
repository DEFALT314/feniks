import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

vi.mock("server-only", () => ({}));
const { countIdeaTests, loadTester, rate, signUp, withdraw } = await import("./tests");

type Result = { data?: unknown; count?: number; error: { code?: string; message: string } | null };

// A minimal stand-in for the Supabase query builder: every chained call returns the same builder,
// awaiting it gives the result queued for that table (or RPC).
function fakeDb(results: Record<string, Result[]>) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const next = (key: string) => results[key]?.shift() ?? { data: [], error: null };
  const builder = (table: string) => {
    let result: Result | undefined;
    const proxy: Record<string, unknown> = new Proxy(
      {},
      {
        get(_t, method: string) {
          if (method === "then") {
            result ??= next(table);
            return (resolve: (r: Result) => void) => resolve(result!);
          }
          return (...args: unknown[]) => {
            calls.push({ table, method, args });
            return proxy;
          };
        },
      },
    );
    return proxy;
  };
  const db = {
    from: (table: string) => builder(table),
    rpc: (name: string, args: unknown) => {
      calls.push({ table: name, method: "rpc", args: [args] });
      return builder(name);
    },
  };
  return { db: db as unknown as SupabaseClient<Database>, calls };
}

const TEST = {
  id: "d3000000-0000-4000-8000-000000000001",
  idea_id: "d1000000-0000-4000-8000-000000000001",
  innowacja_id: null,
  tytul: "Próba",
  opis: null,
  miejsce: null,
  termin: null,
  liczba_miejsc: 3,
};

describe("signUp", () => {
  it("treats a repeated sign-up as done", async () => {
    const { db } = fakeDb({ test_signups: [{ error: { code: "23505", message: "dup" } }] });
    expect(await signUp(db, TEST.id)).toEqual({ ok: true });
  });

  it("explains a full test", async () => {
    const { db } = fakeDb({ test_signups: [{ error: { code: "HM409", message: "full" } }] });
    expect(await signUp(db, TEST.id)).toEqual({
      ok: false,
      error: "Brak wolnych miejsc na ten test.",
    });
  });
});

describe("withdraw and rate", () => {
  it("removes only the user's own sign-up", async () => {
    const { db, calls } = fakeDb({});
    expect(await withdraw(db, "u1", TEST.id)).toEqual({ ok: true });
    expect(calls).toContainEqual({ table: "test_signups", method: "eq", args: ["user_id", "u1"] });
  });

  it("replaces an earlier rating and explains a missing sign-up", async () => {
    const { db, calls } = fakeDb({
      test_ratings: [{ error: null }, { error: { code: "42501", message: "rls" } }],
    });
    const input = { test_id: TEST.id, ocena: 4, co_dzialalo: null, co_poprawic: null };
    expect(await rate(db, "u1", input)).toEqual({ ok: true });
    expect(calls).toContainEqual({
      table: "test_ratings",
      method: "upsert",
      args: [{ ...input, user_id: "u1" }, { onConflict: "test_id,user_id" }],
    });
    expect(await rate(db, "u1", input)).toEqual({
      ok: false,
      error: "Najpierw zapisz się na test, potem go oceń.",
    });
  });
});

describe("loadTester", () => {
  it("returns nothing when there are no tests", async () => {
    const { db } = fakeDb({ tests: [{ data: [], error: null }] });
    expect(await loadTester(db, { id: "u1", isRops: false })).toEqual({ tests: [], feedback: [] });
  });

  it("builds the list and feedback for the author's own test", async () => {
    const { db } = fakeDb({
      tests: [{ data: [TEST], error: null }],
      test_seats_taken: [{ data: [{ test_id: TEST.id, zajete: 2 }], error: null }],
      test_signups: [{ data: [], error: null }],
      test_ratings: [
        { data: [], error: null }, // the user's own ratings
        {
          data: [
            {
              test_id: TEST.id,
              ocena: 5,
              co_dzialalo: "Super",
              co_poprawic: null,
              created_at: "2026-10-03T18:00:00+02:00",
            },
          ],
          error: null,
        },
      ],
      ideas: [{ data: [{ id: TEST.idea_id }], error: null }],
    });
    const page = await loadTester(db, { id: "u1", isRops: false });
    expect(page.tests[0]).toMatchObject({ zajete: 2, zarzadzam: true, zapisy_otwarte: true });
    expect(page.feedback).toEqual([
      {
        test_id: TEST.id,
        liczba_ocen: 1,
        srednia: 5,
        uwagi: [
          {
            ocena: 5,
            co_dzialalo: "Super",
            co_poprawic: null,
            created_at: "2026-10-03T18:00:00+02:00",
          },
        ],
      },
    ]);
  });

  it("fails loudly when a query fails", async () => {
    const { db } = fakeDb({
      tests: [{ data: [TEST], error: null }],
      test_seats_taken: [{ data: null, error: { message: "boom" } }],
    });
    await expect(loadTester(db, { id: "u1", isRops: false })).rejects.toThrow(/boom/);
  });
});

describe("countIdeaTests", () => {
  it("counts the tests of one idea", async () => {
    const { db, calls } = fakeDb({ tests: [{ count: 2, error: null } as Result] });
    expect(await countIdeaTests(db, TEST.idea_id)).toBe(2);
    expect(calls).toContainEqual({ table: "tests", method: "eq", args: ["idea_id", TEST.idea_id] });
  });
});
