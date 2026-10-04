// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCE_EVENT } from "@/components/ui/announcer";
import { GoodPracticeBox } from "./good-practice";

const actions = vi.hoisted(() => ({ setIdeaGoodPractice: vi.fn(), submitReview: vi.fn() }));
vi.mock("../_lib/actions", () => actions);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ID = "d1000000-0000-4000-8000-000000000004";
const base = { ideaId: ID, approved: true, consent: true, publishedAt: null };

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

describe("GoodPracticeBox", () => {
  it("tells ROPS when the author did not agree, with no button", () => {
    const html = renderToStaticMarkup(<GoodPracticeBox {...base} consent={false} />);
    expect(html).toContain("Autor nie zgodził się na pokazanie pomysłu innym.");
    expect(html).not.toContain("<button");
  });

  it("before approval: says consent is there, but offers nothing yet", () => {
    const html = renderToStaticMarkup(<GoodPracticeBox {...base} approved={false} />);
    expect(html).toContain("Po zatwierdzeniu możesz pokazać go w Bibliotece");
    expect(html).not.toContain("<button");
  });

  it("approved with consent: offers showing it", () => {
    const html = renderToStaticMarkup(<GoodPracticeBox {...base} />);
    expect(html).toMatch(/<button[^>]*>Pokaż jako dobrą praktykę<\/button>/);
  });

  it("shown: links to the public page and offers stopping", () => {
    const html = renderToStaticMarkup(
      <GoodPracticeBox {...base} publishedAt="2026-10-04T10:00:00+02:00" />,
    );
    expect(html).toContain("W Bibliotece od 4 października 2026");
    expect(html).toContain(`href="/library/good-practices/${ID}"`);
    expect(html).toMatch(/<button[^>]*>Przestań pokazywać<\/button>/);
  });

  it("publishes, announces the result and keeps focus on the same button", async () => {
    actions.setIdeaGoodPractice.mockResolvedValue({
      status: "saved",
      published: true,
      message: "„Herbatka” jest w Bibliotece jako dobra praktyka.",
    });
    act(() => root.render(<GoodPracticeBox {...base} />));
    const button = container.querySelector("button")!;
    button.focus();
    await act(async () => button.click());
    expect(actions.setIdeaGoodPractice).toHaveBeenCalledWith(ID, true);
    expect(announced).toEqual(["„Herbatka” jest w Bibliotece jako dobra praktyka."]);
    expect(document.activeElement).toBe(button);
  });

  it("stops showing it when it is shown", async () => {
    actions.setIdeaGoodPractice.mockResolvedValue({
      status: "saved",
      published: false,
      message: "",
    });
    act(() => root.render(<GoodPracticeBox {...base} publishedAt="2026-10-04T10:00:00+02:00" />));
    await act(async () => container.querySelector("button")!.click());
    expect(actions.setIdeaGoodPractice).toHaveBeenCalledWith(ID, false);
  });

  it("focuses a refusal so it is read", async () => {
    actions.setIdeaGoodPractice.mockResolvedValue({
      status: "error",
      message: "Autor nie zgodził się na pokazanie tego pomysłu innym.",
    });
    act(() => root.render(<GoodPracticeBox {...base} />));
    await act(async () => container.querySelector("button")!.click());
    expect(document.activeElement?.textContent).toBe(
      "Autor nie zgodził się na pokazanie tego pomysłu innym.",
    );
  });
});
