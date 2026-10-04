import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MyIdea } from "../_lib/ideas";
import { MyIdeas } from "./my-ideas";

vi.mock("../actions", () => ({ startIdea: vi.fn() }));

const IDEA: MyIdea = {
  id: "3f6d2c1e-8b7a-4e5f-9c1d-2a3b4c5d6e7f",
  tytul: "Herbatka sąsiedzka",
  opis: "Opis",
  istota: "Istota",
  dla_kogo: "Seniorzy",
  etap: "przetestowane",
  obszar_id: null,
  wyslany_at: "2026-10-03T18:00:00+02:00",
  zgoda_publikacji_at: "2026-10-03T18:00:00+02:00",
  opublikowany_at: null,
  created_at: "2026-10-03T17:00:00+02:00",
  updated_at: "2026-10-03T18:00:00+02:00",
  answers: {},
  status: "zatwierdzony",
  komentarz: null,
};

describe("MyIdeas", () => {
  it("marks an idea that ROPS shows as a good practice (#104)", () => {
    const shown = renderToStaticMarkup(
      <MyIdeas ideas={[{ ...IDEA, opublikowany_at: "2026-10-04T10:00:00+02:00" }]} />,
    );
    expect(shown).toContain(">W Bibliotece</span>");
    // Consent alone does not mean it is shown
    expect(renderToStaticMarkup(<MyIdeas ideas={[IDEA]} />)).not.toContain("W Bibliotece");
  });
});
