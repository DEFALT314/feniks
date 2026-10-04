import { beforeEach, describe, expect, it, vi } from "vitest";
import { newCardRow } from "@/app/admin/library/_lib/new-card";
import { innovationsFromFiles } from "./from-files";

vi.mock("server-only", () => ({}));

// unstable_cache needs the Next.js runtime; here it only has to call the loader
const cachedLoaders: string[][] = [];
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown, keys: string[]) => {
    cachedLoaders.push(keys);
    return fn;
  },
}));

type Result = { data: unknown[] | null; error: { message: string } | null };

// A Supabase query builder that records the calls and resolves to the given result
function fakeClient(result: Result) {
  const calls: string[] = [];
  const builder = {
    select: () => builder,
    order: () => builder,
    eq: (column: string, value: unknown) => {
      calls.push(`eq ${column}=${value}`);
      return builder;
    },
    then: (resolve: (r: Result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return {
    calls,
    client: {
      from: (table: string) => {
        calls.push(`from ${table}`);
        return builder;
      },
    },
  };
}

const row = {
  ...newCardRow({ nazwa: "Sąsiedzka pomoc", kategoria_id: "dla-seniorow" }, "ab12"),
  opublikowana: true,
  etykieta: null,
  opis_krotki: null,
  problem: null,
  dla_kogo: [],
  kto_moze_wdrozyc: [],
  czy_dziala: null,
  slowa_kluczowe: [],
  spoza_biblioteki: false,
  program: null,
  zrodlo: null,
  pewnosc: null,
  updated_at: "2026-10-04T00:00:00.000Z",
};

const mocks = vi.hoisted(() => ({
  publicClient: null as unknown,
  sessionClient: null as unknown,
  user: null as { role: string } | null,
}));

vi.mock("./public-client", () => ({
  CATALOG_TAG: "catalog",
  CATALOG_REVALIDATE_SECONDS: 60,
  isDatabaseConfigured: () => true,
  createPublicClient: () => mocks.publicClient,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mocks.sessionClient }));
vi.mock("@/lib/auth", async () => ({
  getCurrentUser: async () => mocks.user,
  isRopsRole: (await import("@/lib/auth/roles")).isRopsRole,
}));

async function loadInnovations() {
  vi.resetModules();
  const { getInnovations } = await import("./data");
  return getInnovations();
}

describe("getInnovations", () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.publicClient = null;
    mocks.sessionClient = null;
  });

  it("serves visitors the cached published list, not a per-request session query", async () => {
    const pub = fakeClient({ data: [row], error: null });
    mocks.publicClient = pub.client;
    mocks.user = { role: "mieszkaniec" };

    const cards = await loadInnovations();

    expect(cards.map((c) => c.id)).toEqual([row.id]);
    expect(pub.calls).toEqual(["from innovations", "eq opublikowana=true"]);
    expect(cachedLoaders).toContainEqual(["library-published-innovations"]);
  });

  it("reads live with the session for a ROPS editor, who also sees unpublished cards", async () => {
    const pub = fakeClient({ data: [row], error: null });
    const session = fakeClient({ data: [{ ...row, opublikowana: false }], error: null });
    mocks.publicClient = pub.client;
    mocks.sessionClient = session.client;
    mocks.user = { role: "rops_redaktor" };

    const cards = await loadInnovations();

    expect(cards[0].opublikowana).toBe(false);
    expect(session.calls).toEqual(["from innovations"]);
    expect(pub.calls).toEqual([]);
  });

  it("falls back to data/rops when the database does not answer", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.publicClient = fakeClient({ data: null, error: { message: "timeout" } }).client;

    const cards = await loadInnovations();

    expect(cards).toHaveLength(innovationsFromFiles().length);
  });
});
