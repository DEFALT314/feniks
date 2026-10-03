import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { aiFixtures } from "@/lib/contracts/ai";
import { AiHints } from "./ai-hints";
import { ApplicationDraft } from "./application-draft";
import { SubmitPanel } from "./submit-panel";

vi.mock("../actions", () => ({ sendToRops: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const draft = { title: "Sąsiedzki dyżur", description: "Wolontariusze odwiedzają seniorów." };
const submitProps = {
  ideaId: "3f6d2c1e-8b7a-4e5f-9c1d-2a3b4c5d6e7f",
  sentAt: null,
  status: null,
  comment: null,
  missing: [],
  beforeSend: async () => true,
  justSent: null,
};

describe("AiHints", () => {
  it("offers hints without changing anything on its own", () => {
    const html = renderToStaticMarkup(<AiHints draft={draft} onUse={() => {}} />);
    expect(html).toContain("Podpowiedz");
    expect(html).toContain("Nic nie zmieni się bez Twojej zgody");
    // The panel is not a live region: results are announced as one short sentence instead
    expect(html).not.toContain("aria-live");
  });

  it("needs a title before asking", () => {
    const html = renderToStaticMarkup(<AiHints draft={{ ...draft, title: "" }} onUse={() => {}} />);
    const button = html.match(/<button[^>]*>Podpowiedz<\/button>/)![0];
    expect(button).toContain('aria-disabled="true"');
    // The disabled button stays focusable and says why it is unavailable
    const reasonId = button.match(/aria-describedby="([^"]+)"/)![1];
    expect(html).toMatch(new RegExp(`id="${reasonId}"[^>]*>Najpierw wpisz tytuł pomysłu.`));
  });
});

describe("ApplicationDraft", () => {
  it("lists the open calls and marks demo data", () => {
    const html = renderToStaticMarkup(
      <ApplicationDraft calls={aiFixtures.callList.calls} draft={draft} />,
    );
    expect(html).toContain("Wniosek pod nabór");
    expect(html).toContain("Propozycja AI");
    for (const call of aiFixtures.callList.calls) expect(html).toContain(call.name);
    expect(html).toContain("Dane demonstracyjne");
  });

  it("asks for a description before drafting", () => {
    const html = renderToStaticMarkup(
      <ApplicationDraft calls={aiFixtures.callList.calls} draft={{ ...draft, description: "" }} />,
    );
    const button = html.match(/<button[^>]*>Przygotuj szkic wniosku<\/button>/)![0];
    const reasonId = button.match(/aria-describedby="([^"]+)"/)![1];
    expect(html).toMatch(new RegExp(`id="${reasonId}"[^>]*>Najpierw opisz pomysł`));
  });

  it("renders nothing without calls", () => {
    expect(renderToStaticMarkup(<ApplicationDraft calls={[]} draft={draft} />)).toBe("");
  });
});

describe("SubmitPanel", () => {
  it("offers sending a complete draft", () => {
    const html = renderToStaticMarkup(<SubmitPanel {...submitProps} />);
    expect(html).toMatch(/<button type="submit"[^>]*>Wyślij do ROPS<\/button>/);
    expect(html).not.toContain('disabled=""');
  });

  it("lists what is missing and blocks sending", () => {
    const html = renderToStaticMarkup(
      <SubmitPanel {...submitProps} missing={["Opis", "Istota"]} />,
    );
    expect(html).toContain("uzupełnij: <strong>Opis, Istota</strong>");
    const button = html.match(/<button[^>]*>Wyślij do ROPS<\/button>/)![0];
    expect(button).toContain('aria-disabled="true"');
    const reasonId = button.match(/aria-describedby="([^"]+)"/)![1];
    expect(html).toContain(`<p id="${reasonId}" class="text-base">Żeby wysłać, uzupełnij:`);
  });

  it("shows the status and hides the button while ROPS has the idea", () => {
    const html = renderToStaticMarkup(
      <SubmitPanel {...submitProps} sentAt="2026-10-03T18:00:00Z" status="w_weryfikacji" />,
    );
    expect(html).toContain("ROPS sprawdza pomysł");
    expect(html).not.toContain("Wyślij");
  });

  it("offers a corrected version with the ROPS comment after 'do poprawy'", () => {
    const html = renderToStaticMarkup(
      <SubmitPanel
        {...submitProps}
        sentAt="2026-10-03T18:00:00Z"
        status="do_poprawy"
        comment="Dopisz, kto poprowadzi dyżury."
      />,
    );
    expect(html).toContain("Do poprawy");
    expect(html).toContain("Dopisz, kto poprowadzi dyżury.");
    expect(html).toContain("Wyślij poprawioną wersję");
  });

  it("confirms a send after the page reloads with ?sent=", () => {
    const html = renderToStaticMarkup(
      <SubmitPanel {...submitProps} sentAt="2026-10-03T18:00:00Z" justSent="first" />,
    );
    expect(html).toContain("Wysłano do ROPS.");
    expect(html).not.toContain("Wyślij");
  });
});
