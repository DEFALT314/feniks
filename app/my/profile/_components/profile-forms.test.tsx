// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCE_EVENT } from "@/components/ui/announcer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const actions = vi.hoisted(() => ({ requestRole: vi.fn(), updateDisplayName: vi.fn() }));
vi.mock("../actions", () => actions);

const { RoleRequestForm, isChoiceError, SENT_MESSAGE } = await import("./role-request-form");
const { DisplayNameForm } = await import("./display-name-form");

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
});

async function submit() {
  await act(async () => container.querySelector("form")!.requestSubmit());
  await act(async () => {});
}

describe("isChoiceError", () => {
  it("is true only for the missing choice", () => {
    expect(isChoiceError({ status: "error", message: "Wybierz rolę, o którą prosisz." })).toBe(
      true,
    );
    expect(isChoiceError({ status: "error", message: "Masz już tę rolę." })).toBe(false);
    expect(isChoiceError({ status: "idle" })).toBe(false);
  });
});

describe("RoleRequestForm", () => {
  it("focuses the role group, which names the error, when no role was chosen", async () => {
    actions.requestRole.mockResolvedValue({
      status: "error",
      message: "Wybierz rolę, o którą prosisz.",
    });
    act(() => root.render(<RoleRequestForm pending={null} />));
    await submit();
    const group = container.querySelector('[role="radiogroup"]')!;
    expect(document.activeElement).toBe(group);
    expect(group.getAttribute("aria-describedby")).toBe("role-request-error");
  });

  it("announces a sent request", async () => {
    actions.requestRole.mockResolvedValue({ status: "sent", role: "ngo" });
    act(() => root.render(<RoleRequestForm pending={null} />));
    await submit();
    expect(heard).toHaveBeenCalledWith(SENT_MESSAGE);
  });
});

describe("DisplayNameForm", () => {
  it("focuses the name field after a validation error", async () => {
    actions.updateDisplayName.mockResolvedValue({ status: "error", fieldError: "Wpisz nazwę." });
    act(() => root.render(<DisplayNameForm name="Anna" />));
    await submit();
    expect(document.activeElement).toBe(container.querySelector('input[name="name"]'));
  });
});
