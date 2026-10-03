import { describe, expect, it, vi } from "vitest";
import { innovationsFromFiles } from "@/app/library/_lib/from-files";
import { ServiceCard, type InstitutionProfile } from "@/lib/contracts/middleman";
import { institutionFit, innovationMaterials } from "./facts";

vi.mock("server-only", () => ({}));

const { BUZZWORDS, buzzwordsIn, draftServiceCard, ROPS_FIRST_STEP } = await import("./draft");
const { createCard, editCard, sendCard } = await import("./service");

const innovations = innovationsFromFiles();
const byId = (id: string) => innovations.find((i) => i.id === id)!;
const organizer = byId("organizator-kompleksowej-opieki-w-miejscu-zamieszkania");
const gops: InstitutionProfile = {
  type: "gops",
  name: "GOPS w Przykładowej Woli",
  municipality_kind: "wiejska",
  staff: "Dwie pracownice socjalne.",
  constraints: "Brak samochodu, szpital 30 km.",
};

describe("institutionFit (computed from data)", () => {
  it("good fit when the type is among the innovation's implementers", () => {
    const fit = institutionFit(byId("terapeuta-przestrzeni"), "gops");
    expect(fit.level).toBe("dobra");
    expect(fit.note).toContain("OPS");
  });

  it("partial fit through related bodies, to check otherwise", () => {
    expect(institutionFit(byId("hear-it"), "dps").level).toBe("do_sprawdzenia");
    expect(institutionFit(byId("hear-it"), "dps").note).toMatch(/Zapytaj ROPS/);
  });

  it("every Library innovation gets a fit for every institution type without errors", () => {
    for (const i of innovations) {
      for (const type of ["gops", "mops", "pcpr", "urzad_gminy", "dps", "ngo", "inna"] as const) {
        expect(institutionFit(i, type).note.length).toBeGreaterThan(10);
      }
    }
  });
});

describe("innovationMaterials", () => {
  it("lists the real materials and always the ROPS card", () => {
    const m = innovationMaterials(byId("bawita"));
    expect(m.map((x) => x.label)).toEqual(
      expect.arrayContaining([
        "Opis innowacji (PDF)",
        "Film o innowacji",
        "Karta innowacji w ROPS",
      ]),
    );
    expect(m.at(-1)?.url).toBe(byId("bawita").url);
  });
});

describe("buzzwordsIn", () => {
  it("finds marketing words but ignores the innovation's own name", () => {
    expect(buzzwordsIn("Innowacyjna, kompleksowa usługa")).toEqual(["innowacyjn", "kompleksow"]);
    expect(
      buzzwordsIn("Wdrażamy Organizator kompleksowej opieki w gminie", organizer.nazwa),
    ).toEqual([]);
    expect(BUZZWORDS.length).toBeGreaterThan(5);
  });
});

function fakeLlm(...answers: object[]) {
  const calls: { role: string; content: string }[][] = [];
  return {
    calls,
    client: {
      model: "fake",
      async complete(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
        calls.push(messages);
        return JSON.stringify(answers.shift());
      },
    },
  };
}

const goodDraft = {
  title: "Koordynacja opieki domowej po wypisie",
  for_whom: "Mieszkańcy niesamodzielni po pobycie w szpitalu i ich rodziny.",
  how_it_works: [
    "Szpital lub rodzina zgłasza wypis do GOPS.",
    "Pracownik GOPS odwiedza dom i ustala potrzeby z rodziną.",
    "GOPS organizuje usługi opiekuńcze i sprzęt.",
  ],
  who_delivers: "Pracownica socjalna GOPS jako koordynatorka, z podmiotem opieki długoterminowej.",
  risks: "Brak samochodu utrudni wizyty w odległych domach.",
  first_steps: [
    "Rozmowa z autorami innowacji przez ROPS.",
    "Porozumienie ze szpitalem powiatowym.",
    "Wskazanie koordynatorki w GOPS.",
  ],
};

describe("draftServiceCard", () => {
  const fit = institutionFit(organizer, "gops");

  it("sends only facts about the innovation and the institution", async () => {
    const { client, calls } = fakeLlm(goodDraft);
    await draftServiceCard(organizer, gops, fit, { client });
    const user = calls[0][1].content;
    expect(user).toContain(organizer.opis_krotki!);
    expect(user).toContain("Brak samochodu");
    expect(user).not.toContain("przyklady_zapytan");
  });

  it("makes the model rewrite marketing language", async () => {
    const sloppy = {
      ...goodDraft,
      for_whom: "Innowacyjna, kompleksowa odpowiedź na kluczowe potrzeby.",
    };
    const { client, calls } = fakeLlm(sloppy, goodDraft);
    const out = await draftServiceCard(organizer, gops, fit, { client });
    expect(calls).toHaveLength(2);
    expect(calls[1].at(-1)?.content).toMatch(/marketing words/);
    expect(out.for_whom).toBe(goodDraft.for_whom);
  });

  it("replaces invented numbers and costs with placeholders", async () => {
    const withNumbers = {
      ...goodDraft,
      risks: "Usługa kosztuje 12 000 zł miesięcznie dla 25 osób.",
    };
    const { client } = fakeLlm(withNumbers);
    const out = await draftServiceCard(organizer, gops, fit, { client });
    expect(out.risks).not.toMatch(/\d/);
    expect(out.risks).toContain("[liczba do uzupełnienia]");
  });

  it("always starts with contacting the authors through ROPS, three steps at most", async () => {
    const noRops = {
      ...goodDraft,
      first_steps: ["Wybór koordynatora.", "Spotkanie z rodzinami.", "Ulotka."],
    };
    const { client } = fakeLlm(noRops);
    const out = await draftServiceCard(organizer, gops, fit, { client });
    expect(out.first_steps).toEqual([
      ROPS_FIRST_STEP,
      "Wybór koordynatora.",
      "Spotkanie z rodzinami.",
    ]);
  });
});

// A tiny stand-in for the Supabase client: one table, owner checks are RLS's job (tested in SQL).
function fakeDb() {
  const rows = new Map<string, Record<string, unknown>>();
  let n = 0;
  const from = () => ({
    insert(values: Record<string, unknown>) {
      const now = "2026-10-03T18:00:00.000Z";
      const row = {
        id: `card-${++n}`,
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
      eq: (_c: string, id: string) => ({
        maybeSingle: async () => ({ data: rows.get(id) ?? null }),
      }),
    }),
    update(values: Record<string, unknown>) {
      return {
        eq: (_c: string, id: string) => ({
          select: () => ({
            single: async () => {
              const row = { ...rows.get(id)!, ...values };
              rows.set(id, row);
              return { data: row, error: null };
            },
          }),
        }),
      };
    },
  });
  return { rows, db: { from } as never };
}

describe("service: create, edit, send", () => {
  const draft = vi.fn().mockResolvedValue({ ...goodDraft });

  function deps() {
    const { db, rows } = fakeDb();
    const notifyRops = vi.fn().mockResolvedValue(undefined);
    return {
      rows,
      notifyRops,
      deps: {
        db,
        findInnovation: async (id: string) => innovations.find((i) => i.id === id) ?? null,
        notifyRops,
        draft,
      },
    };
  }

  it("creates a contract-valid card with computed fit, materials and an empty cost estimate", async () => {
    const { deps: d } = deps();
    const result = await createCard({ innovation_id: organizer.id, institution: gops }, d);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(ServiceCard.safeParse(result.card).success).toBe(true);
    expect(result.card.cost).toEqual({
      estimate: null,
      funding_hint: "Sprawdź aktualne nabory w HubMI.",
    });
    expect(result.card.fit?.level).toBeDefined();
    expect(result.card.materials?.at(-1)?.label).toBe("Karta innowacji w ROPS");
  });

  it("404 for an unknown innovation, without asking the model", async () => {
    const { deps: d } = deps();
    draft.mockClear();
    const result = await createCard({ innovation_id: "nie-ma", institution: gops }, d);
    expect(result).toMatchObject({ ok: false, status: 404 });
    expect(draft).not.toHaveBeenCalled();
  });

  it("editing saves a new version and lets the institution fill in the cost", async () => {
    const { deps: d } = deps();
    const created = await createCard({ innovation_id: organizer.id, institution: gops }, d);
    if (!created.ok) throw new Error();
    const edited = await editCard(
      created.card.id,
      { cost_estimate: "Do ustalenia z księgową.", title: "Nowy tytuł" },
      d,
    );
    expect(edited).toMatchObject({
      ok: true,
      card: { version: 2, title: "Nowy tytuł", cost: { estimate: "Do ustalenia z księgową." } },
    });
  });

  it("sending notifies ROPS once and locks the card", async () => {
    const { deps: d, notifyRops } = deps();
    const created = await createCard({ innovation_id: organizer.id, institution: gops }, d);
    if (!created.ok) throw new Error();
    expect(await sendCard(created.card.id, d)).toMatchObject({
      ok: true,
      card: { status: "wyslana_do_rops" },
    });
    await sendCard(created.card.id, d);
    expect(notifyRops).toHaveBeenCalledTimes(1);
    expect(await editCard(created.card.id, { title: "Zmiana" }, d)).toMatchObject({
      ok: false,
      status: 409,
    });
  });

  it("a failed notification does not lose the sent status", async () => {
    const { deps: d, notifyRops } = deps();
    notifyRops.mockRejectedValue(new Error("rpc down"));
    const created = await createCard({ innovation_id: organizer.id, institution: gops }, d);
    if (!created.ok) throw new Error();
    expect(await sendCard(created.card.id, d)).toMatchObject({
      ok: true,
      card: { status: "wyslana_do_rops" },
    });
  });
});
