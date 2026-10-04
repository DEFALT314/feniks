import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/types";
import {
  formatAverage,
  getFeedbackSummary,
  opinionsLabel,
  saveReview,
} from "./innovation-feedback";

function client(
  opts: { existing?: object | null; summary?: unknown; tests?: unknown[]; error?: boolean } = {},
) {
  const writes: { op: string; row: unknown }[] = [];
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "or"]) q[m] = vi.fn(() => q);
  q.order = vi.fn(async () => ({ data: opts.tests ?? [] }));
  q.maybeSingle = vi.fn(async () => ({ data: opts.existing ?? null }));
  q.insert = vi.fn(async (row: unknown) => {
    writes.push({ op: "insert", row });
    return { error: opts.error ? { message: "x" } : null };
  });
  q.update = vi.fn((row: unknown) => {
    writes.push({ op: "update", row });
    return { eq: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) };
  });
  const rpc = vi.fn(async () => ({ data: opts.summary ?? [{ srednia: "4.3", ocen: 3 }] }));
  return { c: { from: vi.fn(() => q), rpc } as unknown as SupabaseClient<Database>, writes, q };
}

describe("getFeedbackSummary", () => {
  it("combines the public average with open tests", async () => {
    const { c, q } = client({
      tests: [{ id: "t1", tytul: "Test", termin: null, miejsce: "online" }],
    });
    const s = await getFeedbackSummary(c, "merkury", new Date("2026-10-04T10:00:00Z"));
    expect(s).toEqual({
      average: 4.3,
      count: 3,
      openTests: [{ id: "t1", tytul: "Test", termin: null, miejsce: "online" }],
    });
    expect(q.or).toHaveBeenCalledWith("termin.is.null,termin.gte.2026-10-04T10:00:00.000Z");
  });

  it("has no average without ratings", async () => {
    const { c } = client({ summary: [{ srednia: null, ocen: 0 }] });
    expect(await getFeedbackSummary(c, "x")).toMatchObject({ average: null, count: 0 });
  });
});

describe("saveReview", () => {
  it("adds a first review and thanks for the improvement proposal", async () => {
    const { c, writes } = client();
    const state = await saveReview(c, "u1", "merkury", {
      ocena: "4",
      co_dzialalo: "Proste",
      co_poprawic: " Tablet ",
    });
    expect(state).toMatchObject({
      status: "saved",
      message: expect.stringContaining("trafiła do ROPS"),
    });
    expect(writes[0]).toEqual({
      op: "insert",
      row: { innowacja_id: "merkury", ocena: 4, co_dzialalo: "Proste", co_poprawic: "Tablet" },
    });
  });

  it("updates an existing review instead of adding a second one", async () => {
    const { c, writes } = client({ existing: { ocena: 3, co_dzialalo: null, co_poprawic: null } });
    await saveReview(c, "u1", "merkury", { ocena: "5" });
    expect(writes[0]).toEqual({
      op: "update",
      row: { ocena: 5, co_dzialalo: null, co_poprawic: null },
    });
  });

  it("requires a score from 1 to 5", async () => {
    const { c, writes } = client();
    expect((await saveReview(c, "u1", "merkury", {})).fieldErrors?.ocena).toMatch(/od 1 do 5/);
    expect((await saveReview(c, "u1", "merkury", { ocena: "7" })).status).toBe("error");
    expect(writes).toHaveLength(0);
  });

  it("reports a database error", async () => {
    const { c } = client({ error: true });
    expect(await saveReview(c, "u1", "merkury", { ocena: "3" })).toMatchObject({ status: "error" });
  });
});

describe("labels", () => {
  it("uses Polish plural forms and a decimal comma", () => {
    expect([1, 2, 5, 12, 22, 25].map(opinionsLabel)).toEqual([
      "1 opinia",
      "2 opinie",
      "5 opinii",
      "12 opinii",
      "22 opinie",
      "25 opinii",
    ]);
    expect(formatAverage(4.3)).toBe("4,3");
  });
});
