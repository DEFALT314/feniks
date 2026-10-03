// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

import { Motion } from "./motion";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let counter: HTMLElement;

const frames = async (n: number) => {
  for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(() => r(null)));
};

beforeEach(() => {
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  // A server-rendered counter that React has not hydrated yet (it streams in after the layout)
  document.body.innerHTML = '<dl><dd data-ruch="licznik">158</dd></dl><div id="app"></div>';
  counter = document.querySelector("dd")!;
  root = createRoot(document.getElementById("app")!);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
});

describe("Motion counter", () => {
  it("leaves the text of a page that has not hydrated yet unchanged", async () => {
    act(() => root.render(<Motion />));
    await frames(3);
    expect(counter.textContent).toBe("158");
    expect(counter.hasAttribute("aria-hidden")).toBe(false);
  });

  it("starts counting once React owns the element", async () => {
    act(() => root.render(<Motion />));
    await frames(2);
    (counter as unknown as Record<string, unknown>)["__reactFiber$test"] = {};
    await frames(3);
    expect(counter.getAttribute("aria-hidden")).toBe("true");
    expect(counter.textContent).not.toBe("158");
  });
});
