// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANNOUNCE_EVENT } from "@/components/ui/announcer";
import { AnnounceOnChange, FlashMessage, FocusHeading } from "./param-focus";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

describe("FocusHeading", () => {
  it("takes focus only when the selected item changes, not on page load", () => {
    act(() => root.render(<FocusHeading focusKey="a">Pomysł A</FocusHeading>));
    expect(document.activeElement).not.toBe(container.querySelector("h2"));
    act(() => root.render(<FocusHeading focusKey="b">Pomysł B</FocusHeading>));
    expect(document.activeElement).toBe(container.querySelector("h2"));
    expect(container.querySelector("h2")?.getAttribute("tabindex")).toBe("-1");
  });

  it("can be the page h1", () => {
    act(() =>
      root.render(
        <FocusHeading level={1} focusKey={null}>
          Tytuł
        </FocusHeading>,
      ),
    );
    expect(container.querySelector("h1")).not.toBeNull();
  });
});

describe("AnnounceOnChange", () => {
  it("announces after a change of the key only", () => {
    act(() => root.render(<AnnounceOnChange changeKey="open" message="Do decyzji: 2 pomysły" />));
    expect(heard).not.toHaveBeenCalled();
    act(() => root.render(<AnnounceOnChange changeKey="all" message="Wszystkie: 5 pomysłów" />));
    expect(heard).toHaveBeenCalledWith("Wszystkie: 5 pomysłów");
  });
});

describe("FlashMessage", () => {
  it("focuses the result of a redirecting action and renders nothing without one", () => {
    act(() => root.render(<FlashMessage message={null} ok />));
    expect(container.innerHTML).toBe("");
    act(() => root.render(<FlashMessage message="Zatwierdzono rolę." ok />));
    expect(document.activeElement?.textContent).toBe("Zatwierdzono rolę.");
  });
});
