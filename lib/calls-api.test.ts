import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Call } from "@/lib/contracts/admin";
import type { Database } from "@/lib/supabase/types";
import { callsToCsv, importCalls, listPublishedCalls } from "./calls";

const CALL: Call = {
  id: "nabor-demo-seniorzy-2026",
  nazwa: "Wsparcie seniorów",
  organizator: "ROPS",
  cel: 'Pomoc "w domu"; bez barier',
  url: null,
  termin_od: "2026-10-01",
  termin_do: "2026-11-30",
  obszary: ["seniorzy", "zdrowie"],
  opublikowany: true,
  demo: true,
};

function listClient() {
  const q: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "eq", "or", "contains"]) q[m] = vi.fn(() => q);
  q.order = vi.fn(async () => ({ data: [CALL], error: null }));
  return { c: { from: vi.fn(() => q) } as unknown as SupabaseClient<Database>, q };
}

describe("listPublishedCalls", () => {
  it("returns only published calls, open ones by default, filtered by area", async () => {
    const { c, q } = listClient();
    await listPublishedCalls(
      c,
      { area: "seniorzy", status: "open" },
      new Date("2026-10-04T10:00:00Z"),
    );
    expect(q.eq).toHaveBeenCalledWith("opublikowany", true);
    expect(q.or).toHaveBeenCalledWith("termin_do.is.null,termin_do.gte.2026-10-04");
    expect(q.contains).toHaveBeenCalledWith("obszary", ["seniorzy"]);
  });

  it("includes past deadlines with status=all", async () => {
    const { c, q } = listClient();
    await listPublishedCalls(c, { status: "all" });
    expect(q.or).not.toHaveBeenCalled();
    expect(q.contains).not.toHaveBeenCalled();
  });
});

describe("callsToCsv", () => {
  it("writes a BOM, semicolons, quotes special characters and joins areas", () => {
    const csv = callsToCsv([CALL]);
    expect(
      csv.startsWith("﻿id;nazwa;organizator;cel;url;termin_od;termin_do;obszary;demo\r\n"),
    ).toBe(true);
    expect(csv).toContain('"Pomoc ""w domu""; bez barier"');
    expect(csv).toContain(";seniorzy,zdrowie;true\r\n");
    expect(csv).toContain("Wsparcie seniorów");
  });
});

describe("importCalls", () => {
  function importClient(existing: string[], failId?: string) {
    const writes: { op: string; id: string; row: Record<string, unknown> }[] = [];
    const from = vi.fn(() => ({
      select: vi.fn(() => ({ in: vi.fn(async () => ({ data: existing.map((id) => ({ id })) })) })),
      insert: vi.fn(async (row: Record<string, unknown>) => {
        writes.push({ op: "insert", id: String(row.id), row });
        return { error: row.id === failId ? { message: "x" } : null };
      }),
      update: vi.fn((row: Record<string, unknown>) => ({
        eq: vi.fn(async (_c: string, id: string) => {
          writes.push({ op: "update", id, row });
          return { error: null };
        }),
      })),
    }));
    return { c: { from } as unknown as SupabaseClient<Database>, writes };
  }

  it("adds new calls switched off, updates known ones without touching the switch", async () => {
    const { c, writes } = importClient(["nabor-stary-2026"]);
    const writeAudit = vi.fn(async () => 1);

    const result = await importCalls(
      { supabase: c, writeAudit },
      {
        calls: [
          {
            id: "nabor-nowy-2027",
            nazwa: "Nowy nabór",
            termin_do: "2027-02-01",
            obszary: ["seniorzy"],
          },
          { id: "nabor-stary-2026", nazwa: "Stary nabór, nowy termin", termin_do: "2026-12-31" },
        ],
      },
    );

    expect(result).toEqual({ created: 1, updated: 1, errors: [] });
    expect(writes[0]).toMatchObject({
      op: "insert",
      id: "nabor-nowy-2027",
      row: { opublikowany: false },
    });
    expect(writes[1].op).toBe("update");
    expect(writes[1].row).not.toHaveProperty("opublikowany");
    expect(writeAudit).toHaveBeenCalledWith(expect.objectContaining({ akcja: "nabor.import" }));
  });

  it("reports invalid items and database errors, and keeps going", async () => {
    const { c } = importClient([], "nabor-blad-2027");
    const result = await importCalls(
      { supabase: c, writeAudit: vi.fn(async () => 1) },
      {
        calls: [
          { id: "Zła Nazwa", nazwa: "x" },
          {
            id: "nabor-daty-2027",
            nazwa: "Złe daty",
            termin_od: "2027-03-01",
            termin_do: "2027-01-01",
          },
          { id: "nabor-blad-2027", nazwa: "Błąd zapisu" },
          { id: "nabor-dobry-2027", nazwa: "Dobry nabór" },
        ],
      },
    );
    expect(result.created).toBe(1);
    expect(result.errors.map((e) => e.index)).toEqual([0, 1, 2]);
  });
});
