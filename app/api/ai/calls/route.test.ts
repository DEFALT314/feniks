import { beforeEach, describe, expect, it, vi } from "vitest";
import { innovationsFromFiles } from "@/app/library/_lib/from-files";
import { challengeAreasFromFiles } from "@/app/challenge-map/_lib/from-files";
import { RankedCallList } from "@/lib/contracts/ai";

vi.mock("server-only", () => ({}));
const currentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => currentUser() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/ai/matching/server", () => ({
  searchDeps: async () => ({
    innovations: innovationsFromFiles(),
    areas: challengeAreasFromFiles(),
    embedQuery: async () => null,
    vectorSearch: async () => [],
  }),
}));
vi.mock("@/lib/ai/creator/open-calls", async () => {
  const { CALLS } = await import("@/lib/ai/creator/creator");
  return { openCalls: async () => CALLS };
});

const { POST } = await import("./route");
const post = (body: unknown) =>
  new Request("http://app/api/ai/calls", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => currentUser.mockReset().mockResolvedValue({ id: "u1", role: "mieszkaniec" }));

describe("POST /api/ai/calls", () => {
  it("does not offer the seniors call first for an idea about homeless people", async () => {
    const res = await POST(
      post({
        idea: {
          title: "Darmowe jedzenie dla bezdomnych",
          description:
            "Codziennie wieczorem wydajemy ciepły posiłek osobom w kryzysie bezdomności w świetlicy parafialnej.",
        },
      }),
    );
    const body = RankedCallList.parse(await res.json());
    expect(body.idea_areas.map((a) => a.id)).toContain("bezdomnosc");
    expect(body.calls[0].fit).not.toBe("inny");
    expect(body.calls.find((c) => c.id === "nabor-demo-seniorzy-2026")?.fit).toBe("inny");
  });

  it("puts the seniors call first for an idea about seniors", async () => {
    const res = await POST(
      post({
        idea: {
          title: "Sąsiedzki dyżur po wypisie",
          description:
            "Wolontariusze odwiedzają samotnych seniorów po powrocie ze szpitala do domu.",
        },
      }),
    );
    const body = RankedCallList.parse(await res.json());
    expect(body.calls[0]).toMatchObject({ id: "nabor-demo-seniorzy-2026", fit: "pasuje" });
  });

  it("is for signed-in users only", async () => {
    currentUser.mockResolvedValue(null);
    expect((await POST(post({ idea: { title: "x", description: "y" } }))).status).toBe(401);
  });
});
