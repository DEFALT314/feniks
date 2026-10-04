// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCE_EVENT } from "@/components/ui/announcer";
import { aiFixtures, type ReviewCheck } from "@/lib/contracts/ai";
import { cardFieldId, IdeaReview, reviewSummary } from "./idea-review";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const postJson = vi.fn();
vi.mock("../_lib/api", () => ({ postJson: (...args: unknown[]) => postJson(...args) }));

const review = aiFixtures.reviewResponse;
const ideaId = "30cfff84-f3d1-4750-bf7a-9e4951bdd378";
const draft = {
  title: "Sąsiedzki dyżur",
  description: "Wolontariusze odwiedzają seniorów po szpitalu.",
};

let container: HTMLDivElement;
let root: Root;
let announced: string[];
const onAnnounce = (event: Event) => announced.push((event as CustomEvent<string>).detail);
const button = (name: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(name))!;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  announced = [];
  window.addEventListener(ANNOUNCE_EVENT, onAnnounce);
  postJson.mockReset().mockResolvedValue({ ok: true, data: review });
});

afterEach(() => {
  act(() => root.unmount());
  window.removeEventListener(ANNOUNCE_EVENT, onAnnounce);
  container.remove();
  document.body.innerHTML = "";
});

async function renderAndCheck(onAdd = vi.fn(), editable = true) {
  act(() =>
    root.render(<IdeaReview ideaId={ideaId} draft={draft} editable={editable} onAdd={onAdd} />),
  );
  await act(async () => button("Sprawdź fiszkę").click());
  return onAdd;
}

describe("IdeaReview", () => {
  it("sends the card with the idea id and shows the points grouped, each with its evidence", async () => {
    await renderAndCheck();
    expect(postJson).toHaveBeenCalledWith(
      "/api/ai/review",
      { idea: draft, idea_id: ideaId },
      expect.anything(),
    );
    const text = container.textContent!;
    expect(text).toContain("Do poprawy: 2 braki, 1 rzecz do przemyślenia, 1 mocna strona.");
    expect(text).toContain("3 z 4 pól");
    expect(text).toContain("14 z 22 pytań");
    // canvas evidence with the author's answer, and a Library quote with a link to the card
    expect(text).toContain("Twoja kanwa, pytanie „Główny dochód”: Nie wiemy jeszcze");
    const inn = review.similar[0];
    expect(container.querySelector(`a[href="/library/${inn.id}"]`)?.textContent).toBe(inn.nazwa);
    // AI points carry the label, computed ones say they come from the author's answers
    expect(container.querySelectorAll("[data-slot=badge]").length).toBeGreaterThan(0);
    expect(text).toContain("Propozycja AI");
    expect(text).toContain("Z Twoich odpowiedzi");
    // a canvas point links to its question
    expect(
      container.querySelector(`a[href="/my/creator/${ideaId}?step=glowny-dochod"]`),
    ).not.toBeNull();
    expect(announced.at(-1)).toBe(reviewSummary(review.checks));
  });

  it("adds the suggested sentence only after a click, and confirms it", async () => {
    const onAdd = await renderAndCheck();
    expect(onAdd).not.toHaveBeenCalled();
    act(() => button("Dopisz zdanie").click());
    expect(onAdd).toHaveBeenCalledWith(
      "opis",
      "O wypisie seniora informuje nas ośrodek pomocy społecznej.",
    );
    expect(container.textContent).toContain("Dopisano do pola „Opis”.");
  });

  it("'Przejdź do pola' focuses the card field", async () => {
    const field = document.createElement("textarea");
    field.id = cardFieldId("audience");
    document.body.append(field);
    await renderAndCheck();
    act(() => button("Przejdź do pola „Dla kogo”").click());
    expect(document.activeElement).toBe(field);
  });

  it("'Pomiń' hides a point and updates the summary", async () => {
    await renderAndCheck();
    act(() => button("Pomiń").click());
    expect(container.textContent).toContain("Do poprawy: 1 brak, 1 rzecz do przemyślenia");
  });

  it("on a sent idea shows the points without actions that would change it", async () => {
    await renderAndCheck(vi.fn(), false);
    expect(container.textContent).not.toContain("Dopisz zdanie");
    expect(container.textContent).not.toContain("Przejdź do pola");
    expect(container.querySelector("a[href*='?step=']")).toBeNull();
  });

  it("shows the error and says the card can be sent without the check", async () => {
    postJson.mockResolvedValue({ ok: false, error: "Asystent AI nie odpowiada." });
    await renderAndCheck();
    expect(container.textContent).toContain("Asystent AI nie odpowiada.");
    expect(container.textContent).toContain("Fiszkę możesz wysłać do ROPS bez niego.");
  });
});

describe("reviewSummary", () => {
  const check = (kind: ReviewCheck["kind"]) => ({ ...review.checks[0], kind });
  it("counts in Polish and says when nothing is left", () => {
    expect(reviewSummary([check("brakuje")])).toBe("Do poprawy: 1 brak.");
    expect(reviewSummary(Array(5).fill(check("brakuje")))).toBe("Do poprawy: 5 braków.");
    expect(reviewSummary([check("mocna_strona")])).toBe(
      "Fiszka jest kompletna. Zobacz, co warto podkreślić.",
    );
    expect(reviewSummary([])).toBe("Fiszka jest kompletna. Nie mamy uwag.");
  });
});
