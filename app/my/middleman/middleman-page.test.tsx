import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import fixture from "@/lib/contracts/fixtures/middleman.json";
import type { ServiceCard } from "@/lib/contracts/middleman";
import { ServiceCardBody, ServiceCardFacts } from "./_components/service-card-view";
import { defaultInstitution, fromLines, toLines } from "./_lib/institution";

const card = fixture.card as ServiceCard;
const calls = [
  { id: "c", name: "Nabór demo", organizer: "ROPS", goal: "Cel.", deadline: null, demo: true },
];

describe("institution helpers", () => {
  it("prefills from the user's institution in P4's table", () => {
    expect(
      defaultInstitution({ nazwa: "GOPS w Przykładowej Woli (fikcyjny)", typ: "OPS" }),
    ).toEqual({
      type: "gops",
      name: "GOPS w Przykładowej Woli",
      municipality_kind: "wiejska",
    });
    expect(defaultInstitution(null).name).toBe("");
  });

  it("edits lists one item per line, dropping numbering and empty lines", () => {
    expect(fromLines("1. Rozmowa z ROPS\n\n- Porozumienie\n2) Koordynator ")).toEqual([
      "Rozmowa z ROPS",
      "Porozumienie",
      "Koordynator",
    ]);
    expect(fromLines(toLines(card.first_steps))).toEqual(card.first_steps);
  });
});

describe("service card view", () => {
  it("labels the AI draft and leaves the cost for the institution", () => {
    const html = renderToStaticMarkup(<ServiceCardBody card={card} />);
    expect(html).toContain("Propozycja AI, do sprawdzenia przez GOPS w Przykładowej Woli");
    expect(html).toContain("uzupełnia GOPS w Przykładowej Woli");
    expect(html).toContain('href="#nabory"');
    expect(html).toContain("<li>Rozmowa z autorami innowacji przez ROPS.</li>");
  });

  it("shows the institution's own cost once filled in", () => {
    const html = renderToStaticMarkup(
      <ServiceCardBody card={{ ...card, cost: { ...card.cost, estimate: "Z budżetu GOPS." } }} />,
    );
    expect(html).toContain("Z budżetu GOPS.");
    expect(html).not.toContain("uzupełnia");
  });

  it("shows computed fit, materials and demo calls apart from the AI text", () => {
    const html = renderToStaticMarkup(<ServiceCardFacts card={card} calls={calls} />);
    expect(html).toContain("Pasuje do Twojej instytucji");
    expect(html).toContain("Karta innowacji w ROPS");
    expect(html).toContain("(otwiera się w nowej karcie)");
    expect(html).toContain("Dane demonstracyjne");
    // the side panel labels are headings under the card's h2
    expect(html).toMatch(/<h3[^>]*>Aktualne nabory<\/h3>/);
    expect(html).toMatch(/<h3[^>]*>Na podstawie<\/h3>/);
    expect(html).toContain('id="nabory"');
    expect(html).toContain(
      'href="/library/organizator-kompleksowej-opieki-w-miejscu-zamieszkania"',
    );
  });
});
