// @vitest-environment happy-dom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const { RouteFocus } = await import("./route-focus");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  pathname = "/";
  document.body.innerHTML = '<main id="main-content"><h1>Strona</h1></main>';
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
});

describe("RouteFocus", () => {
  it("leaves focus alone on the first load, also when Strict Mode runs effects twice", () => {
    act(() =>
      root.render(
        <StrictMode>
          <RouteFocus />
        </StrictMode>,
      ),
    );
    expect(document.activeElement).toBe(document.body);
  });

  it("moves focus to the new page's heading after a client-side navigation", () => {
    act(() =>
      root.render(
        <StrictMode>
          <RouteFocus />
        </StrictMode>,
      ),
    );
    pathname = "/library";
    act(() =>
      root.render(
        <StrictMode>
          <RouteFocus />
        </StrictMode>,
      ),
    );
    expect(document.activeElement?.tagName).toBe("H1");
  });
});
