// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCE_EVENT } from "@/components/ui/announcer";
import { PublicationConsent } from "./publication-consent";
import { SubmitPanel } from "./submit-panel";

const actions = vi.hoisted(() => ({
  sendToRops: vi.fn(async () => ({ status: "sent" as const, resent: false })),
  setIdeaConsent: vi.fn(),
}));
vi.mock("../actions", () => actions);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ID = "3f6d2c1e-8b7a-4e5f-9c1d-2a3b4c5d6e7f";
const panel = {
  ideaId: ID,
  sentAt: null,
  status: null,
  comment: null,
  missing: [],
  beforeSend: async () => true,
  justSent: null,
  consent: false,
  publishedAt: null,
};

let container: HTMLDivElement;
let root: Root;
let announced: string[];
const onAnnounce = (e: Event) => announced.push((e as CustomEvent<string>).detail);

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  announced = [];
  window.addEventListener(ANNOUNCE_EVENT, onAnnounce);
  vi.clearAllMocks();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.removeEventListener(ANNOUNCE_EVENT, onAnnounce);
});

describe("consent in the send form", () => {
  it("asks in the issue's words, unticked until the author chooses", () => {
    const html = renderToStaticMarkup(<SubmitPanel {...panel} />);
    const box = html.match(/<input[^>]*type="checkbox"[^>]*>/)![0];
    expect(box).toContain('name="zgoda"');
    expect(box).not.toContain("checked");
    expect(html).toContain(
      "Zgadzam się, żeby ROPS pokazał mój pomysł innym, bez mojego imienia i nazwiska.",
    );
    // The hint says what is shown and that consent can be withdrawn
    const hintId = box.match(/aria-describedby="([^"]+)"/)![1];
    expect(html).toMatch(
      new RegExp(`id="${hintId}"[^>]*>[^<]*Zgodę możesz wycofać w każdej chwili`),
    );
  });

  it("keeps an earlier consent ticked on a corrected version", () => {
    const html = renderToStaticMarkup(
      <SubmitPanel {...panel} sentAt="2026-10-03T18:00:00Z" status="do_poprawy" consent />,
    );
    expect(html).toMatch(/<input[^>]*name="zgoda"[^>]*checked=""/);
  });

  it("sends the author's choice with the idea", async () => {
    act(() => root.render(<SubmitPanel {...panel} />));
    const box = container.querySelector<HTMLInputElement>('input[name="zgoda"]')!;
    await act(async () => box.click());
    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(actions.sendToRops).toHaveBeenCalledWith(ID, true);
  });

  it("sends false when the box stays unticked", async () => {
    act(() => root.render(<SubmitPanel {...panel} />));
    await act(async () => container.querySelector("form")!.requestSubmit());
    expect(actions.sendToRops).toHaveBeenCalledWith(ID, false);
  });
});

describe("PublicationConsent after sending", () => {
  it("is shown instead of the send form while ROPS has the idea", () => {
    const html = renderToStaticMarkup(
      <SubmitPanel {...panel} sentAt="2026-10-03T18:00:00Z" status="w_weryfikacji" />,
    );
    expect(html).toContain("Pokazywanie innym");
    expect(html).not.toContain('name="zgoda"');
  });

  it("without consent: only ROPS and experts see it, and the author can allow showing it", () => {
    const html = renderToStaticMarkup(
      <PublicationConsent ideaId={ID} consent={false} publishedAt={null} />,
    );
    expect(html).toContain("Pomysł widzą tylko ROPS i eksperci.");
    expect(html).toMatch(/<button[^>]*>Pozwól pokazać pomysł innym<\/button>/);
  });

  it("with consent: explains what happens next and offers withdrawing it", () => {
    const html = renderToStaticMarkup(
      <PublicationConsent ideaId={ID} consent publishedAt={null} />,
    );
    expect(html).toContain("może pokazać fiszkę innym");
    expect(html).toMatch(/<button[^>]*>Wycofaj zgodę<\/button>/);
  });

  it("published: links to the public page and warns that withdrawing takes it down", () => {
    const html = renderToStaticMarkup(
      <PublicationConsent ideaId={ID} consent publishedAt="2026-10-04T10:00:00+02:00" />,
    );
    expect(html).toContain("Pokazujemy w Bibliotece");
    expect(html).toContain("od 4 października 2026");
    expect(html).toContain(`href="/library/good-practices/${ID}"`);
    const button = html.match(/<button[^>]*>Wycofaj zgodę<\/button>/)![0];
    const hintId = button.match(/aria-describedby="([^"]+)"/)![1];
    expect(html).toMatch(new RegExp(`id="${hintId}"[^>]*>Pomysł od razu zniknie z Biblioteki`));
  });

  it("withdraws consent, announces the result once and keeps focus on the button", async () => {
    actions.setIdeaConsent.mockResolvedValue({
      status: "saved",
      consent: false,
      message: "Wycofaliśmy zgodę. Pomysł zniknął z Biblioteki.",
    });
    act(() =>
      root.render(
        <PublicationConsent ideaId={ID} consent publishedAt="2026-10-04T10:00:00+02:00" />,
      ),
    );
    const button = container.querySelector("button")!;
    button.focus();
    await act(async () => button.click());
    expect(actions.setIdeaConsent).toHaveBeenCalledWith(ID, false);
    expect(announced).toEqual(["Wycofaliśmy zgodę. Pomysł zniknął z Biblioteki."]);
    expect(document.activeElement?.tagName).toBe("BUTTON");
    expect(container.querySelector("[aria-live],[role=status]")).toBeNull();
  });

  it("focuses an error so it is read", async () => {
    actions.setIdeaConsent.mockResolvedValue({
      status: "error",
      message: "Nie udało się zapisać zgody. Spróbuj ponownie.",
    });
    act(() => root.render(<PublicationConsent ideaId={ID} consent={false} publishedAt={null} />));
    await act(async () => container.querySelector("button")!.click());
    expect(document.activeElement?.textContent).toBe(
      "Nie udało się zapisać zgody. Spróbuj ponownie.",
    );
  });
});
