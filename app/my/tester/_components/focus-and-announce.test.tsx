// @vitest-environment happy-dom
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCE_EVENT } from "@/components/ui/announcer";
import { testerFixture, type TesterTest } from "@/lib/contracts/innovation-tester";
import { RatingForm } from "./rating-form";
import { TesterBoard } from "./tester-board";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const actions = vi.hoisted(() => ({
  signUpForTest: vi.fn(),
  withdrawFromTest: vi.fn(),
  rateTest: vi.fn(),
}));
vi.mock("../actions", () => actions);

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
});

afterEach(() => {
  act(() => root.unmount());
  window.removeEventListener(ANNOUNCE_EVENT, onAnnounce);
  container.remove();
  document.body.innerHTML = "";
});

const [merkury] = testerFixture.testy;
const notSigned: TesterTest = { ...merkury, zapisany: false, moja_ocena: null };
const button = (name: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent === name)!;

describe("RatingForm", () => {
  it("focuses the first score, linked to the error, when sent without a score", () => {
    const signed = { ...notSigned, zapisany: true };
    act(() => root.render(<RatingForm test={signed} headingRef={createRef()} />));
    act(() => button("Wyślij ocenę").click());
    const first = container.querySelector<HTMLInputElement>('input[type="radio"][value="1"]')!;
    expect(document.activeElement).toBe(first);
    expect(document.getElementById(first.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Wybierz ocenę od 1 do 5.",
    );
    expect(actions.rateTest).not.toHaveBeenCalled();
  });
});

describe("TesterBoard", () => {
  it("moves focus to 'Oceń test' when 'Zapisz się' is replaced, and announces the result", async () => {
    actions.signUpForTest.mockResolvedValue({ ok: true });
    act(() => root.render(<TesterBoard tests={[notSigned]} />));
    const signUp = button("Zapisz się");
    signUp.focus();
    await act(async () => signUp.click());
    expect(announced.at(-1)).toBe("Zapisano Cię na test.");
    // The server revalidates the page: the card now shows the signed-up actions
    act(() => root.render(<TesterBoard tests={[{ ...notSigned, zapisany: true }]} />));
    expect(document.activeElement).toBe(button("Oceń test"));
  });

  it("continues from the list heading when 'Wypisz się' removes the whole card", async () => {
    actions.withdrawFromTest.mockResolvedValue({ ok: true });
    const signed = { ...notSigned, zapisany: true, zapisy_otwarte: false };
    act(() => root.render(<TesterBoard tests={[signed]} />));
    const withdraw = button("Wypisz się");
    withdraw.focus();
    await act(async () => withdraw.click());
    act(() => root.render(<TesterBoard tests={[]} />));
    expect(document.activeElement?.id).toBe("open-heading");
    expect(announced.at(-1)).toBe("Wypisano Cię z testu.");
  });
});
