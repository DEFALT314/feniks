// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "@/lib/contracts/fixtures/middleman.json";
import type { ServiceCard } from "@/lib/contracts/middleman";
import { FOCUS, MiddlemanWorkbench } from "./workbench";

const announce = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/announcer", () => ({ announce }));
vi.mock("next/link", () => ({
  default: ({ href, ...rest }: { href: string } & Record<string, unknown>) => (
    <a href={href} {...rest} />
  ),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const card = fixture.card as ServiceCard;
const other: ServiceCard = { ...card, id: "other-card", title: "Inna karta" };
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

function renderWorkbench(opts: { name?: string; cards?: ServiceCard[]; open?: boolean } = {}) {
  const cards = opts.cards ?? [];
  act(() =>
    root.render(
      <MiddlemanWorkbench
        innovations={[{ id: card.based_on.id, nazwa: card.based_on.nazwa }]}
        initialInnovationId={card.based_on.id}
        initialInstitution={{ ...card.institution, name: opts.name ?? card.institution.name }}
        cards={cards}
        initialCardId={opts.open ? (cards[0]?.id ?? null) : null}
        calls={[]}
      />,
    ),
  );
}

const button = (text: string) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(text))!;
const click = async (el: HTMLElement) => {
  await act(async () => el.click());
};
const reply = (body: unknown) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body)));

describe("MiddlemanWorkbench focus and announcements", () => {
  it("ties the missing institution name to its field and focuses it", async () => {
    renderWorkbench({ name: "" });
    await click(button("Przygotuj szkic"));
    const input = container.querySelector<HTMLInputElement>('input[aria-invalid="true"]')!;
    expect(input).not.toBeNull();
    expect(document.activeElement).toBe(input);
    const errorId = input.getAttribute("aria-describedby")!.split(" ").at(-1)!;
    expect(document.getElementById(errorId)?.textContent).toMatch(/Wpisz nazwę instytucji/);
    expect(input.required).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("after drafting announces the wait and focuses the card title", async () => {
    reply(card);
    renderWorkbench();
    await click(button("Przygotuj szkic"));
    expect(announce).toHaveBeenCalledWith(expect.stringMatching(/AI przygotowuje szkic/));
    expect(document.activeElement?.id).toBe(FOCUS.cardTitle);
    expect(container.querySelector("[aria-live], [role=status], [role=alert]")).toBeNull();
  });

  it("announces a failed draft", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Spróbuj za chwilę." }), { status: 500 }),
    );
    renderWorkbench();
    await click(button("Przygotuj szkic"));
    expect(announce).toHaveBeenLastCalledWith("Spróbuj za chwilę.");
    expect(container.textContent).toContain("Spróbuj za chwilę.");
  });

  it("moves focus into the edit form and back to 'Edytuj szkic' on cancel and save", async () => {
    reply({ ...card, version: card.version + 1 });
    renderWorkbench({ cards: [card], open: true });
    await click(button("Edytuj szkic"));
    expect(document.activeElement?.id).toBe(FOCUS.editFirstField);
    await click(button("Anuluj"));
    expect(document.activeElement?.id).toBe(FOCUS.editButton);

    await click(button("Edytuj szkic"));
    await act(async () => {
      container
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(announce).toHaveBeenLastCalledWith("Zapisano zmiany w szkicu.");
    expect(document.activeElement?.id).toBe(FOCUS.editButton);
  });

  it("after sending focuses the confirmation that replaced the button", async () => {
    reply({ ...card, status: "wyslana_do_rops" });
    renderWorkbench({ cards: [card], open: true });
    await click(button("Poproś ROPS o opinię"));
    expect(document.activeElement?.id).toBe(FOCUS.sent);
    expect(document.activeElement?.textContent).toMatch(/Wysłano do ROPS/);
  });

  it("lists the cards as links and focuses the opened card's title", async () => {
    renderWorkbench({ cards: [card, other], open: true });
    const link = [...container.querySelectorAll("nav a")].find(
      (a) => a.textContent === "Inna karta",
    ) as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/my/middleman?card=other-card");
    await click(link);
    expect(document.activeElement?.id).toBe(FOCUS.cardTitle);
    expect(document.activeElement?.textContent).toBe("Inna karta");
  });

  it("names the print button for what it does and marks required edit fields", async () => {
    renderWorkbench({ cards: [card], open: true });
    expect(button("Drukuj albo zapisz jako PDF")).toBeDefined();
    await click(button("Edytuj szkic"));
    expect(container.querySelector("form")!.textContent!.split("(wymagane)").length - 1).toBe(6);
  });
});
