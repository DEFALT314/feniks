import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { testerFixture, type TesterTest } from "@/lib/contracts/innovation-tester";
import { PlanTestPanel } from "./plan-test-panel";
import { TesterView } from "./tester-view";

vi.mock("../actions", () => ({
  signUpForTest: vi.fn(),
  withdrawFromTest: vi.fn(),
  rateTest: vi.fn(),
  planIdeaTest: vi.fn(),
}));

const [merkury, cuder, ideaTest] = testerFixture.testy;
const render = (tests: TesterTest[] = testerFixture.testy) =>
  renderToStaticMarkup(<TesterView tests={tests} feedback={testerFixture.opinie} />);

// The <article> of one test card, found by its heading
function card(html: string, testId: string): string {
  const start = html.indexOf(`id="test-${testId}"`);
  return html.slice(start, html.indexOf("</ul>", start));
}

describe("TesterView", () => {
  it("offers sign-up and links the innovation to the Library", () => {
    const html = card(render(), merkury.id);
    expect(html).toMatch(/<button[^>]*>Zapisz się<\/button>/);
    expect(html).toContain('href="/library/merkury"');
    expect(html).toContain("wolne: 17 z 20");
    expect(html).toContain("Termin do ustalenia");
  });

  it("shows the sign-up, the user's rating and opens the rating form for it", () => {
    const html = render();
    expect(card(html, cuder.id)).toContain("Jesteś zapisany");
    expect(card(html, cuder.id)).toMatch(/<button[^>]*>Wypisz się<\/button>/);
    expect(card(html, cuder.id)).toMatch(/<button[^>]*>Zmień ocenę<\/button>/);
    expect(html).toContain("Oceń: Senior CUDER");
    expect(html).toMatch(/<input[^>]*type="radio"[^>]*checked=""[^>]*value="4"/);
    expect(html).toContain("Większe litery na kartach.");
  });

  it("keeps the user's own test out of the open list and shows its feedback", () => {
    const html = render();
    const open = html.slice(html.indexOf('id="open-heading"'), html.indexOf("<aside"));
    expect(open).not.toContain(ideaTest.tytul);
    expect(html).toContain('id="managed-heading"');
    expect(card(html, ideaTest.id)).toContain("Średnia ocena: 4,5 z 5");
    expect(card(html, ideaTest.id)).toContain("(2 oceny)");
    expect(card(html, ideaTest.id)).toContain("Lista telefonów do OPS na lodówce.");
  });

  it("hides tests the user can no longer join", () => {
    const closed = { ...merkury, zapisy_otwarte: false };
    expect(render([closed])).not.toContain(merkury.tytul);
    expect(render([{ ...closed, zapisany: true }])).toContain(merkury.tytul);
  });

  it("explains an empty list and the rating panel without a sign-up", () => {
    const html = render([]);
    expect(html).toContain("Teraz nie ma otwartych testów");
    expect(html).toContain("Zapisz się na test. Po spotkaniu ocenisz go tutaj");
    expect(html).not.toContain('id="managed-heading"');
  });

  it("announces results politely and does not promise an AI summary yet", () => {
    const html = render();
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain("Propozycja AI");
  });
});

describe("PlanTestPanel", () => {
  it("starts collapsed with a disclosure button", () => {
    const html = renderToStaticMarkup(<PlanTestPanel ideaId={ideaTest.id} testCount={0} />);
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>Zaplanuj test<\/button>/);
    expect(html).toMatch(/<form[^>]*hidden=""/);
    expect(html).not.toContain("Zaplanowane testy");
  });

  it("links to the feedback when tests exist", () => {
    const html = renderToStaticMarkup(<PlanTestPanel ideaId={ideaTest.id} testCount={2} />);
    expect(html).toContain("Zaplanowane testy: 2.");
    expect(html).toContain('href="/my/tester#managed-heading"');
  });
});
