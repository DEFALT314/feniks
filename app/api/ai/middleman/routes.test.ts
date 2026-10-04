import { beforeEach, describe, expect, it, vi } from "vitest";
import { innovationsFromFiles } from "@/app/library/_lib/from-files";
import { ServiceCard } from "@/lib/contracts/middleman";

vi.mock("server-only", () => ({}));

let user: { id: string } | null = { id: "u1" };
const rows = new Map<string, Record<string, unknown>>();
const notify = vi.fn().mockResolvedValue(1);
const generate = vi.fn();

const table = {
  insert(values: Record<string, unknown>) {
    const now = new Date().toISOString();
    const row = {
      id: `c${rows.size + 1}`,
      version: 1,
      status: "szkic",
      created_at: now,
      updated_at: now,
      ...values,
    };
    rows.set(row.id, row);
    return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
  },
  select: () => ({
    eq: (_c: string, id: string) => ({ maybeSingle: async () => ({ data: rows.get(id) ?? null }) }),
  }),
  update: (values: Record<string, unknown>) => ({
    eq: (_c: string, id: string) => ({
      select: () => ({
        single: async () => {
          rows.set(id, { ...rows.get(id)!, ...values });
          return { data: rows.get(id), error: null };
        },
      }),
    }),
  }),
};

vi.mock("@/lib/auth", () => ({ getCurrentUser: async () => user }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: () => table }) }));
vi.mock("@/app/library/_lib/data", () => ({
  getInnovationById: async (id: string) => innovationsFromFiles().find((i) => i.id === id) ?? null,
}));
vi.mock("@/lib/notifications", () => ({ addNotification: (...a: unknown[]) => notify(...a) }));
vi.mock("@/lib/ai/llm", async (original) => ({
  ...(await original<typeof import("@/lib/ai/llm")>()),
  generateJson: (...a: unknown[]) => generate(...a),
}));

const { POST: create } = await import("./route");
const { PATCH: edit } = await import("./[id]/route");
const { POST: send } = await import("./[id]/send/route");

const institution = {
  type: "gops",
  name: "GOPS w Przykładowej Woli",
  municipality_kind: "wiejska",
};
const json = (body: unknown) =>
  new Request("http://app/api/ai/middleman", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.9.0.${Math.random()}` },
    body: JSON.stringify(body),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  user = { id: "u1" };
  rows.clear();
  notify.mockClear();
  vi.stubEnv("LLM_BASE_URL", "http://llm");
  vi.stubEnv("LLM_MODEL", "m");
  vi.stubEnv("LLM_API_KEY", "k");
  generate.mockResolvedValue({
    title: "Koordynacja opieki po wypisie",
    for_whom: "Seniorzy po szpitalu.",
    how_it_works: [
      "Rodzina zgłasza wypis.",
      "Pracownik GOPS odwiedza dom.",
      "GOPS organizuje opiekę.",
    ],
    who_delivers: "Pracownica socjalna GOPS.",
    risks: "Brak samochodu.",
    first_steps: [
      "Rozmowa z autorami przez ROPS.",
      "Porozumienie ze szpitalem.",
      "Wybór koordynatora.",
    ],
  });
});

describe("Middleman API", () => {
  it("asks to sign in first", async () => {
    user = null;
    const res = await create(json({ innovation_id: "bawita", institution }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/Zaloguj się/);
  });

  it("creates, edits (new version) and sends a card, notifying ROPS", async () => {
    const created = await create(
      json({
        innovation_id: "organizator-kompleksowej-opieki-w-miejscu-zamieszkania",
        institution,
      }),
    );
    const card = await created.json();
    expect(created.status).toBe(200);
    expect(ServiceCard.safeParse(card).success).toBe(true);

    const patched = await edit(
      new Request("http://app", {
        method: "PATCH",
        body: JSON.stringify({ cost_estimate: "Z budżetu GOPS." }),
      }),
      params(card.id),
    );
    expect(await patched.json()).toMatchObject({
      version: 2,
      cost: { estimate: "Z budżetu GOPS." },
    });

    const sent = await send(new Request("http://app", { method: "POST" }), params(card.id));
    expect(await sent.json()).toMatchObject({ status: "wyslana_do_rops" });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ role: ["rops_redaktor", "rops_admin"], typ: "karta_uslugi" }),
    );
  });

  it("validates input and unknown cards", async () => {
    const invalid = await create(
      json({ innovation_id: "bawita", institution: { type: "szkola" } }),
    );
    expect(invalid.status).toBe(400);
    // worded for this form, not the idea creator's "tytuł i opis pomysłu"
    expect((await invalid.json()).error).toContain("nazwę instytucji");
    expect((await create(json({ innovation_id: "nie-ma", institution }))).status).toBe(404);
    const badEdit = await edit(
      new Request("http://app", { method: "PATCH", body: JSON.stringify({ title: "" }) }),
      params("x"),
    );
    expect(badEdit.status).toBe(400);
    expect(
      (await send(new Request("http://app", { method: "POST" }), params("nie-ma"))).status,
    ).toBe(404);
  });
});
