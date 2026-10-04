import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/types";
import {
  formatDate,
  listOpenCalls,
  parseCallForm,
  saveCall,
  setPublished,
  type CallDeps,
} from "./calls";

const ROW = {
  id: "nabor-demo-seniorzy-2026",
  nazwa: "Wsparcie seniorów",
  organizator: "ROPS",
  cel: "Pomoc seniorom",
  url: null,
  termin_od: "2026-10-01",
  termin_do: "2026-11-30",
  obszary: ["seniorzy"],
  opublikowany: true,
  demo: true,
};

function form(fields: Record<string, string | string[]>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) f.append(k, x);
  return f;
}

function deps(
  opts: {
    existing?: typeof ROW | null;
    authors?: { user_id: string; email: string; tytul: string }[];
    writeError?: { code: string };
  } = {},
) {
  const writes: { op: string; row: unknown }[] = [];
  const query: Record<string, unknown> = {};
  for (const m of ["select", "eq", "or", "order"]) query[m] = vi.fn(() => query);
  query.maybeSingle = vi.fn(async () => ({
    data: opts.existing === undefined ? ROW : opts.existing,
  }));
  query.then = (resolve: (v: unknown) => void) => resolve({ data: [ROW], error: null });
  query.insert = vi.fn((row: unknown) => {
    writes.push({ op: "insert", row });
    return Promise.resolve({ error: opts.writeError ?? null });
  });
  query.update = vi.fn((row: unknown) => {
    writes.push({ op: "update", row });
    return { eq: vi.fn(async () => ({ error: opts.writeError ?? null })) };
  });
  const rpc = vi.fn(async () => ({ data: opts.authors ?? [] }));
  const d: CallDeps = {
    supabase: { from: vi.fn(() => query), rpc } as unknown as SupabaseClient<Database>,
    writeAudit: vi.fn(async () => 1),
    addNotification: vi.fn(async () => 1),
    sendEmail: vi.fn(async () => ({ sent: true as const, id: "e" })),
    siteUrl: "https://hubmi.pl",
  };
  return { d, writes, rpc, query };
}

const base = {
  id: "nabor-demo-seniorzy-2026",
  nazwa: "Wsparcie seniorów",
  organizator: "ROPS",
  obszary: ["seniorzy"],
  opublikowany: "on",
};

describe("listOpenCalls", () => {
  it("maps published calls to P3's CallSummary shape", async () => {
    const { d, query } = deps();
    expect(await listOpenCalls(d.supabase, new Date("2026-10-03T12:00:00Z"))).toEqual([
      {
        id: ROW.id,
        name: ROW.nazwa,
        organizer: "ROPS",
        goal: "Pomoc seniorom",
        deadline: "2026-11-30",
        demo: true,
        areas: ROW.obszary,
      },
    ]);
    expect(query.eq).toHaveBeenCalledWith("opublikowany", true);
    expect(query.or).toHaveBeenCalledWith("termin_do.is.null,termin_do.gte.2026-10-03");
  });
});

describe("parseCallForm", () => {
  it("reads repeated areas and the switch, and validates dates", () => {
    const ok = parseCallForm(
      form({ ...base, obszary: ["seniorzy", "zdrowie"], termin_do: "2026-12-01" }),
    );
    expect(ok.success && ok.data).toMatchObject({
      obszary: ["seniorzy", "zdrowie"],
      opublikowany: true,
      termin_do: "2026-12-01",
    });
    const bad = parseCallForm(form({ ...base, termin_od: "2026-12-01", termin_do: "2026-11-01" }));
    expect(bad.success).toBe(false);
    expect(parseCallForm(form({ ...base, id: "Zła Nazwa" })).success).toBe(false);
  });
});

describe("saveCall", () => {
  it("notifies and e-mails authors of matching ideas when the deadline moves", async () => {
    const { d, rpc, writes } = deps({
      authors: [{ user_id: "u1", email: "anna@gmail.com", tytul: "Kawiarenka" }],
    });

    const state = await saveCall(d, form({ ...base, termin_do: "2026-12-20" }), ROW.id);

    expect(state).toMatchObject({ status: "saved", notified: 1 });
    expect(writes[0]).toMatchObject({
      op: "update",
      row: expect.objectContaining({ termin_do: "2026-12-20" }),
    });
    expect(rpc).toHaveBeenCalledWith("call_matching_authors", { p_obszary: ["seniorzy"] });
    expect(d.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: ["u1"],
        typ: "nabor_termin",
        tytul: expect.stringContaining("20 grudnia 2026"),
      }),
    );
    expect(d.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "anna@gmail.com" }));
    expect(d.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        akcja: "nabor.edycja",
        szczegoly: expect.objectContaining({ poprzedni_termin: "2026-11-30" }),
      }),
    );
  });

  it("does not notify when the deadline is unchanged or the call is hidden", async () => {
    const same = deps({ authors: [{ user_id: "u1", email: "a@gmail.com", tytul: "x" }] });
    await saveCall(same.d, form({ ...base, termin_do: "2026-11-30" }), ROW.id);
    expect(same.rpc).not.toHaveBeenCalled();

    const hidden = deps({ authors: [{ user_id: "u1", email: "a@gmail.com", tytul: "x" }] });
    const off = { ...base, opublikowany: "off" };
    await saveCall(hidden.d, form({ ...off, termin_do: "2027-01-10" }), ROW.id);
    expect(hidden.rpc).not.toHaveBeenCalled();
  });

  it("adds a new call and reports a duplicate id", async () => {
    const created = deps({ existing: null });
    expect(await saveCall(created.d, form({ ...base, id: "nabor-nowy-2027" }), null)).toMatchObject(
      { status: "saved" },
    );
    expect(created.writes[0]).toMatchObject({
      op: "insert",
      row: expect.objectContaining({ id: "nabor-nowy-2027" }),
    });

    const dup = deps({ existing: null, writeError: { code: "23505" } });
    expect(await saveCall(dup.d, form(base), null)).toMatchObject({
      message: "Nabór o tym identyfikatorze już istnieje.",
    });
  });

  it("tells matching authors about a call that is switched on in the form", async () => {
    const author = { user_id: "u1", email: "anna@gmail.com", tytul: "Kawiarenka" };
    const created = deps({ existing: null, authors: [author] });
    const state = await saveCall(created.d, form({ ...base, id: "nabor-nowy-2027" }), null);
    expect(state).toMatchObject({ status: "saved", notified: 1 });
    expect(created.d.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: ["u1"], typ: "nabor_nowy", link: "/my/creator" }),
    );
    expect(created.d.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "anna@gmail.com", heading: "Ruszył nowy nabór" }),
    );

    // A hidden call published in an edit counts as new too
    const hidden = deps({ existing: { ...ROW, opublikowany: false }, authors: [author] });
    await saveCall(hidden.d, form(base), ROW.id);
    expect(hidden.d.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ typ: "nabor_nowy" }),
    );

    // A new hidden call notifies nobody
    const draft = deps({ existing: null, authors: [author] });
    await saveCall(draft.d, form({ ...base, opublikowany: "off" }), null);
    expect(draft.rpc).not.toHaveBeenCalled();
  });

  it("returns field errors without writing", async () => {
    const { d, writes } = deps();
    const state = await saveCall(d, form({ ...base, nazwa: "" }), ROW.id);
    expect(state.status).toBe("error");
    expect(state.fieldErrors?.nazwa).toBeDefined();
    expect(writes).toHaveLength(0);
  });
});

describe("setPublished", () => {
  const author = { user_id: "u1", email: "anna@gmail.com", tytul: "Kawiarenka" };

  it("notifies matching authors when a hidden call is switched on", async () => {
    const { d, writes } = deps({ existing: { ...ROW, opublikowany: false }, authors: [author] });
    expect(await setPublished(d, ROW.id, true)).toBe(true);
    expect(writes[0]).toMatchObject({ op: "update", row: { opublikowany: true } });
    expect(d.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: ["u1"], typ: "nabor_nowy" }),
    );
    expect(d.writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({ akcja: "nabor.wlaczenie" }),
    );
  });

  it("does not notify when switching off or when the call was already on", async () => {
    const off = deps({ authors: [author] });
    await setPublished(off.d, ROW.id, false);
    expect(off.d.addNotification).not.toHaveBeenCalled();

    const already = deps({ existing: ROW, authors: [author] });
    await setPublished(already.d, ROW.id, true);
    expect(already.d.addNotification).not.toHaveBeenCalled();
  });
});

describe("formatDate", () => {
  it("writes dates in Polish", () => {
    expect(formatDate("2026-11-30")).toBe("30 listopada 2026");
    expect(formatDate(null)).toBe("bez terminu");
  });
});
