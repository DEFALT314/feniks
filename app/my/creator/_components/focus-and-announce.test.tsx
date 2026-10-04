// @vitest-environment happy-dom
import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCE_EVENT } from "@/components/ui/announcer";
import { aiFixtures, type HintResponse } from "@/lib/contracts/ai";
import type { CanvasAnswer } from "@/lib/contracts/idea-creator";
import { fields } from "../_lib/canvas";
import { AiHints, hintsAnnouncement } from "./ai-hints";
import { ApplicationDraft } from "./application-draft";
import { Question } from "./question";
import { SaveStatusText } from "./save-status";
import { SubmitPanel } from "./submit-panel";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const postJson = vi.fn();
vi.mock("../_lib/api", () => ({ postJson: (...args: unknown[]) => postJson(...args) }));
vi.mock("../actions", () => ({ sendToRops: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

let container: HTMLDivElement;
let root: Root;
let announced: string[];
const onAnnounce = (event: Event) => announced.push((event as CustomEvent<string>).detail);

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  announced = [];
  window.addEventListener(ANNOUNCE_EVENT, onAnnounce);
  postJson.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  window.removeEventListener(ANNOUNCE_EVENT, onAnnounce);
  container.remove();
  document.body.innerHTML = "";
});

const field = (id: string) => fields.find((f) => f.id === id)!;
const button = (name: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(name))!;

// A Question with its own state, as the wizard holds it
function StatefulQuestion({ id, initial }: { id: string; initial?: CanvasAnswer }) {
  const [answer, setAnswer] = useState(initial);
  return <Question field={field(id)} answer={answer} onChange={setAnswer} />;
}

describe("Question", () => {
  it("exposes the question heading for the wizard to focus after a step change", () => {
    const ref = createRef<HTMLHeadingElement>();
    act(() =>
      root.render(
        <Question
          field={field("intensywnosc")}
          answer={undefined}
          onChange={() => {}}
          headingRef={ref}
        />,
      ),
    );
    expect(ref.current?.tagName).toBe("H2");
    ref.current!.focus();
    expect(document.activeElement).toBe(ref.current);
  });

  it("refuses a fourth pick without disabling the option, and says why", () => {
    const options = field("wartosc-emocjonalna").opcje!;
    act(() =>
      root.render(
        <StatefulQuestion id="wartosc-emocjonalna" initial={{ choices: options.slice(0, 3) }} />,
      ),
    );
    const fourth = container.querySelector<HTMLInputElement>(`input[value="${options[3]}"]`)!;
    expect(fourth.disabled).toBe(false);
    act(() => fourth.click());
    expect(fourth.checked).toBe(false);
    expect(announced.at(-1)).toContain("najwyżej trzy");
    const first = container.querySelector<HTMLInputElement>(`input[value="${options[0]}"]`)!;
    act(() => first.click());
    expect(announced.at(-1)).toBe("Zaznaczono 2 z 3.");
  });

  it("moves focus to the new partner's name, and to 'Dodaj partnera' after removing a row", () => {
    act(() =>
      root.render(<StatefulQuestion id={fields.find((f) => f.typ === "lista_partnerow")!.id} />),
    );
    act(() => button("Dodaj partnera").click());
    const names = container.querySelectorAll<HTMLInputElement>("input");
    expect(names).toHaveLength(2);
    expect(document.activeElement).toBe(names[1]);

    const remove = container.querySelector<HTMLButtonElement>('[aria-label="Usuń partnera 2"]')!;
    remove.focus();
    act(() => remove.click());
    expect(document.activeElement).toBe(button("Dodaj partnera"));
    expect(announced.at(-1)).toBe("Usunięto partnera 2.");
  });

  it("labels each partner row's fields with the row number", () => {
    act(() =>
      root.render(<StatefulQuestion id={fields.find((f) => f.typ === "lista_partnerow")!.id} />),
    );
    const labels = [...container.querySelectorAll("label")].map((l) => l.textContent);
    expect(labels).toEqual(["Partner 1: nazwa", "W czym pomoże partner 1", "Status partnera 1"]);
  });
});

const draft = { title: "Sąsiedzki dyżur", description: "Wolontariusze odwiedzają seniorów." };
const hints: HintResponse["hints"] = [
  { field: "title", text: "Dyżur sąsiedzki po wypisie", why: "Krócej." },
  { field: "essence", text: "Nikt nie wraca ze szpitala do pustego domu.", why: "" },
];

describe("AiHints", () => {
  async function showHints(onUse = vi.fn()) {
    postJson.mockResolvedValue({ ok: true, data: { hints } });
    act(() => root.render(<AiHints draft={draft} onUse={onUse} />));
    await act(async () => button("Podpowiedz").click());
    return onUse;
  }

  it("announces a short summary instead of the whole panel", async () => {
    await showHints();
    expect(announced.at(-1)).toBe(hintsAnnouncement(hints));
    expect(announced.at(-1)).toBe(
      "Gotowe: 2 podpowiedzi od asystenta AI (Tytuł, Istota). Propozycja AI.",
    );
    expect(container.querySelector("[aria-live]")).toBeNull();
  });

  it("focuses the confirmation that replaces 'Użyj'", async () => {
    const onUse = await showHints();
    act(() => button("Użyj").click());
    expect(onUse).toHaveBeenCalledWith("tytul", hints[0].text);
    expect(document.activeElement?.textContent).toBe("Wstawiono do pola „Tytuł”.");
  });

  it("moves focus to the next hint after 'Pomiń', then to the panel heading", async () => {
    await showHints();
    act(() => button("Pomiń").click());
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Propozycja AI: Istota");
    act(() => button("Pomiń").click());
    expect(document.activeElement?.id).toBe("hints-heading");
  });
});

describe("ApplicationDraft", () => {
  const calls = aiFixtures.callList.calls;
  const sections = [
    { key: "cel", title: "Cel projektu", text: "Cel [kwota]", needs_user_input: true },
  ];

  it("keeps the edited draft when the call changes, labels it as AI and announces it briefly", async () => {
    postJson.mockResolvedValue({ ok: true, data: { sections } });
    act(() => root.render(<ApplicationDraft calls={calls} draft={draft} />));
    await act(async () => button("Przygotuj szkic wniosku").click());
    expect(announced.at(-1)).toBe(
      "Gotowe: szkic wniosku ma 1 część. Propozycja AI do sprawdzenia.",
    );

    const textarea = container.querySelector("textarea")!;
    const hint = document.getElementById(textarea.getAttribute("aria-describedby")!)!;
    expect(hint.textContent).toContain("Propozycja AI");

    const select = container.querySelector("select")!;
    act(() => {
      select.value = calls[1].id;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.querySelector("textarea")).not.toBeNull();
    expect(container.textContent).toContain(`Ten szkic dotyczy naboru „${calls[0].name}”`);
  });
});

describe("SaveStatusText", () => {
  const autosave = (status: "saving" | "saved" | "error") => ({
    status,
    error: status === "error" ? "Brak połączenia." : null,
    flush: async () => true,
    hasUnsaved: () => false,
  });

  it("stays silent while saving and announces only a failure", () => {
    act(() => root.render(<SaveStatusText autosave={autosave("saving")} />));
    act(() => root.render(<SaveStatusText autosave={autosave("saved")} />));
    expect(container.querySelector("[role=status],[aria-live]")).toBeNull();
    expect(announced).toEqual([]);
    act(() => root.render(<SaveStatusText autosave={autosave("error")} />));
    expect(announced).toEqual(["Nie zapisano zmian. Brak połączenia."]);
  });
});

describe("SubmitPanel", () => {
  it("focuses the confirmation after the page reloads with ?sent=", () => {
    act(() =>
      root.render(
        <SubmitPanel
          ideaId="3f6d2c1e-8b7a-4e5f-9c1d-2a3b4c5d6e7f"
          sentAt="2026-10-03T18:00:00Z"
          status={null}
          comment={null}
          missing={[]}
          beforeSend={async () => true}
          justSent="first"
          consent={false}
          publishedAt={null}
        />,
      ),
    );
    expect(document.activeElement?.textContent).toContain("Wysłano do ROPS.");
  });
});
