import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import fixture from "@/lib/contracts/fixtures/match.json";
import type { MatchResponse } from "@/lib/contracts/match";
import { MatchResult, shortSummary } from "./match-result";

const ai = fixture.response as MatchResponse;
const render = (result: MatchResponse, choosing = false) =>
  renderToStaticMarkup(<MatchResult result={result} choosing={choosing} />);

describe("MatchResult", () => {
  it("marks the decisive words in the description and in the innovations", () => {
    const html = render(ai);
    expect(html).toContain(">ze szpitala</mark>");
    expect(html).toContain(">sprzęt w domu</mark>");
    expect(html).toContain(">po wyjściu ze szpitala</mark>");
  });

  it("labels AI picks as an AI proposal and shows the reason with the quote", () => {
    const html = render(ai);
    expect(html).toContain("Propozycja AI, wybór należy do Ciebie");
    expect(html).toContain("Pomaga zorganizować opiekę");
    // each AI reason is labelled, not only the heading of the result
    const reasons = html.split("Dlaczego pasuje</span>").length - 1;
    expect(reasons).toBe(ai.innovations.length);
    expect(html.split("(Propozycja AI)").length - 1).toBe(reasons);
    expect(html).toContain(
      "„organizacja opieki, sprzętu i wsparcia dostosowanych do możliwości bliskich”",
    );
  });

  it("labels the model's explanation when nothing fits", () => {
    const html = render({
      ...ai,
      innovations: [],
      match_quality: "weak",
      no_match_reason: "Opis dotyczy transportu, a w Bibliotece nie ma takich innowacji.",
    });
    expect(html).toContain("nie ma takich innowacji. <span");
    expect(html).toContain("(Propozycja AI)");
  });

  it("shows no AI label and no reasons for the ranking-only phase, with a status message", () => {
    const html = render({ ...ai, picked_by: "search" }, true);
    expect(html).not.toContain("Propozycja AI");
    expect(html).not.toContain("Dlaczego pasuje");
    expect(html).toContain('role="status"');
    expect(html).toContain("AI wybiera najlepiej pasujące innowacje");
    expect(html).toContain("Wstępne wyniki wyszukiwania");
  });

  it("links to the innovation card, the service card and the challenge area", () => {
    const html = render(ai);
    expect(html).toContain(
      'href="/library/organizator-kompleksowej-opieki-w-miejscu-zamieszkania"',
    );
    expect(html).toContain(
      'href="/my/middleman?innovation=organizator-kompleksowej-opieki-w-miejscu-zamieszkania"',
    );
    expect(html).toContain('href="/challenge-map?area=seniorzy#area"');
    expect(html).toContain('href="/my/messages/new?topic=Potrzeba');
  });

  it("without a match explains why and stresses reporting the need", () => {
    const html = render(fixture.response_no_match as MatchResponse);
    expect(html).toContain("nie ma jeszcze innowacji o opiece nad małymi dziećmi");
    expect(html).toContain("Wygląda na to, że takiego rozwiązania jeszcze nie ma.");
    const link = html.match(/<a[^>]*href="\/my\/messages\/new[^"]*"[^>]*>/)?.[0] ?? "";
    expect(link).toContain("bg-primary");
  });

  it("numbers the steps without a gap when there is no challenge", () => {
    const html = render({ ...ai, challenge: null });
    expect(html).not.toContain("Wyzwanie z Mapy Wyzwań ROPS");
    expect(html).toMatch(/>2<\/span><h3[^>]*>Pasujące innowacje/);
  });

  it("explains the further results and says what each one is", () => {
    const html = render(ai);
    expect(html).toContain(`Inne innowacje, które mogą pasować (${ai.more.length})`);
    expect(html).toContain("Wybrała je wyszukiwarka, AI ich nie oceniała.");
    expect(html).not.toContain("Zobacz też");
    const first = ai.more[0];
    expect(html).toContain(`href="/library/${first.id}"`);
    if (first.opis_krotki) expect(html).toContain(shortSummary(first.opis_krotki)!);
    expect(html).not.toMatch(/<details[^>]*open/);
  });

  it("when nothing above fits calls them the closest finds and shows them open", () => {
    const html = render({ ...ai, innovations: [], match_quality: "weak" });
    expect(html).toContain("Najbliższe, co znaleźliśmy");
    expect(html).toMatch(/<details[^>]*open/);
    // a weak result that still has picks keeps the plain heading
    expect(render({ ...ai, match_quality: "weak" })).toContain(
      "Inne innowacje, które mogą pasować",
    );
  });

  it("in the ranking phase does not mention the AI in the further results", () => {
    const html = render({ ...ai, picked_by: "search" });
    expect(html).toContain("Mniej podobne do Twojego opisu niż te powyżej.");
  });
});

describe("shortSummary", () => {
  it("keeps the first sentence and cuts long ones at a word", () => {
    expect(shortSummary("Pierwsze zdanie. Drugie zdanie.")).toBe("Pierwsze zdanie.");
    expect(shortSummary("Zabiegi spa (m.in. masaże) w domu. Drugie.")).toBe(
      "Zabiegi spa (m.in. masaże) w domu.",
    );
    const long = shortSummary(`${"słowo ".repeat(40)}koniec.`, 60)!;
    expect(long.endsWith("…")).toBe(true);
    expect(long.length).toBeLessThanOrEqual(61);
    expect(long).not.toMatch(/\s…$/);
    expect(shortSummary(null)).toBeNull();
  });
});
