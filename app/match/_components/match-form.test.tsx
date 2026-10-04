// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "@/lib/contracts/fixtures/match.json";
import { MatchForm } from "./match-form";

const announce = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/announcer", () => ({ announce }));
vi.mock("next/link", () => ({
  default: ({ href, ...rest }: { href: string } & Record<string, unknown>) => (
    <a href={href} {...rest} />
  ),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const fetchMock = vi.fn();

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  announce.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const textarea = () => container.querySelector<HTMLTextAreaElement>("textarea")!;
const submitButton = () =>
  [...container.querySelectorAll("button")].find((b) => b.textContent === "Dopasuj")!;

async function submitForm() {
  await act(async () => {
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

describe("MatchForm", () => {
  it("after a short submit focuses the description, which carries the error", async () => {
    act(() => root.render(<MatchForm initialDescription="" />));
    submitButton().focus();
    await submitForm();
    expect(document.activeElement).toBe(textarea());
    expect(textarea().getAttribute("aria-invalid")).toBe("true");
    const errorId = textarea().getAttribute("aria-describedby")!.split(" ").at(-1)!;
    expect(document.getElementById(errorId)?.textContent).toMatch(/co najmniej 10 znaków/);
    expect(textarea().required).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    // a second failed submit moves focus back again
    submitButton().focus();
    await submitForm();
    expect(document.activeElement).toBe(textarea());
  });

  it("an example fills the field and focuses it without starting the search", () => {
    act(() => root.render(<MatchForm initialDescription="" />));
    const chip = [...container.querySelectorAll("button")].find((b) =>
      b.textContent?.startsWith("Samotni seniorzy"),
    )!;
    expect(container.textContent).toContain("kliknij, żeby wpisać do pola");
    act(() => chip.click());
    expect(textarea().value).toBe("Samotni seniorzy na wsi z objawami depresji");
    expect(document.activeElement).toBe(textarea());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("announces short summaries and has no live region around the result", async () => {
    const ranking = { ...fixture.response, picked_by: "search" };
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(ranking)))
      .mockResolvedValueOnce(new Response(JSON.stringify(fixture.response)));
    act(() => root.render(<MatchForm initialDescription="Tata wraca ze szpitala po udarze." />));
    submitButton().focus();
    await submitForm();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(announce.mock.calls.map((c) => c[0])).toEqual([
      "Szukam w Bibliotece ROPS…",
      "Znaleźliśmy 2 wstępne wyniki. AI wybiera najlepiej pasujące, to potrwa kilka sekund.",
      "Gotowe. Znaleźliśmy 2 propozycje AI.",
    ]);
    expect(container.querySelector("#result-title")).not.toBeNull();
    expect(container.querySelector("[aria-live], [role=status], [role=alert]")).toBeNull();
    // focus is not pulled into the result
    expect(document.activeElement?.closest("form")).not.toBeNull();
  });
});
