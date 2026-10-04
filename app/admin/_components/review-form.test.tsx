// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCE_EVENT } from "@/components/ui/announcer";
import type { ReviewState } from "../_lib/review";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const submitReview = vi.hoisted(() =>
  vi.fn<(id: string, s: ReviewState, f: FormData) => Promise<ReviewState>>(),
);
vi.mock("../_lib/actions", () => ({ submitReview }));

const { ReviewForm } = await import("./review-form");

let container: HTMLDivElement;
let root: Root;
const heard = vi.fn();

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  window.addEventListener(ANNOUNCE_EVENT, (e) => heard((e as CustomEvent<string>).detail));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  heard.mockReset();
  submitReview.mockReset();
});

async function decide(label: string) {
  const button = [...container.querySelectorAll("button")].find((b) => b.textContent === label)!;
  button.focus();
  await act(async () => {
    container.querySelector("form")!.requestSubmit(button);
  });
  await act(async () => {});
}

describe("ReviewForm", () => {
  it("focuses the comment field when a decision needs it", async () => {
    submitReview.mockResolvedValue({
      status: "error",
      fieldErrors: { komentarz: "Napisz, co poprawić." },
    });
    act(() => root.render(<ReviewForm ideaId="i1" experts={[]} currentExpertId={null} />));
    await decide("Do poprawy");
    expect(document.activeElement).toBe(container.querySelector("textarea"));
  });

  it("announces a saved decision and keeps focus when the idea moves on", async () => {
    submitReview.mockResolvedValue({ status: "saved", message: "Zapisano.", emailSent: true });
    act(() => root.render(<ReviewForm ideaId="i1" experts={[]} currentExpertId={null} />));
    await decide("Zatwierdź");
    expect(heard).toHaveBeenCalledWith("Zapisano. Autor dostał powiadomienie i maila.");
    // The queue reloads with the next idea: the form (and the pressed button) is replaced
    act(() => root.render(<ReviewForm ideaId="i2" experts={[]} currentExpertId={null} />));
    expect(document.activeElement).not.toBe(document.body);
  });
});
