// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCE_EVENT } from "@/components/ui/announcer";
import type { FormState } from "../_lib/actions";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const replyAction = vi.hoisted(() =>
  vi.fn<(threadId: string, s: FormState, f: FormData) => Promise<FormState>>(),
);
vi.mock("../_lib/actions", () => ({ replyAction, startAction: vi.fn() }));

const { ReplyForm } = await import("./reply-form");

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
  replyAction.mockReset();
});

async function send(text: string) {
  const textarea = container.querySelector("textarea")!;
  textarea.value = text;
  container.querySelector<HTMLButtonElement>('button[type="submit"]')!.focus();
  await act(async () => {
    container.querySelector("form")!.requestSubmit();
  });
  await act(async () => {});
  return textarea;
}

describe("ReplyForm", () => {
  it("after sending, empties the field, keeps focus in it and confirms once", async () => {
    replyAction.mockResolvedValue({ sentAt: 1 });
    act(() => root.render(<ReplyForm threadId="t1" />));
    const textarea = await send("Dziękuję");
    expect(replyAction).toHaveBeenCalledOnce();
    expect(textarea.value).toBe("");
    expect(document.activeElement).toBe(textarea);
    expect(heard).toHaveBeenCalledWith("Wiadomość wysłana.");
    expect(container.querySelector("[aria-live]")).toBeNull();
  });

  it("after a field error keeps the text and focuses the field", async () => {
    replyAction.mockResolvedValue({ error: "Napisz wiadomość (do 5000 znaków)." });
    act(() => root.render(<ReplyForm threadId="t1" />));
    const textarea = await send("   ");
    expect(document.activeElement).toBe(textarea);
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
    expect(textarea.value).toBe("   ");
  });

  it("focuses a form-level error", async () => {
    replyAction.mockResolvedValue({ error: "Nie udało się wysłać wiadomości. Spróbuj ponownie." });
    act(() => root.render(<ReplyForm threadId="t1" />));
    const textarea = await send("Halo");
    expect(document.activeElement?.hasAttribute("data-form-error")).toBe(true);
    expect(textarea.value).toBe("Halo");
  });
});
