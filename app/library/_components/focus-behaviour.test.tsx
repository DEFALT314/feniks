// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HashFocus } from "./hash-focus";
import { VideoPlayer } from "./video-player";

// No network: the player must not load YouTube in tests
vi.mock("../_lib/youtube", () => ({
  embedUrl: () => "about:blank",
  thumbnailUrl: () => "",
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
  window.location.hash = "";
  vi.useRealTimers();
});

describe("VideoPlayer", () => {
  it("moves focus to the player that replaces the pressed button", () => {
    act(() => root.render(<VideoPlayer id="abc" title="BaWita" />));
    const button = container.querySelector("button")!;
    button.focus();
    act(() => button.click());
    const frame = container.querySelector("iframe");
    expect(frame).not.toBeNull();
    expect(container.querySelector("button")).toBeNull();
    expect(document.activeElement).toBe(frame);
  });

  it("does not clip the focus ring with overflow-hidden", () => {
    act(() => root.render(<VideoPlayer id="abc" title="BaWita" />));
    const wrapper = container.querySelector("button")!.parentElement!;
    expect(wrapper.className).not.toContain("overflow-hidden");
  });
});

describe("HashFocus", () => {
  function renderResults(changeKey: string) {
    act(() =>
      root.render(
        <>
          <h2 id="results">3 innowacje</h2>
          <HashFocus hash="results" targetId="results" changeKey={changeKey} />
        </>,
      ),
    );
  }

  it("focuses the target when the URL points at it", () => {
    vi.useFakeTimers();
    window.location.hash = "#results";
    renderResults("q=a");
    act(() => vi.runAllTimers());
    expect(document.activeElement?.id).toBe("results");
  });

  it("focuses again after the results change", () => {
    vi.useFakeTimers();
    window.location.hash = "#results";
    renderResults("page=1");
    act(() => vi.runAllTimers());
    (document.activeElement as HTMLElement).blur();
    renderResults("page=2");
    act(() => vi.runAllTimers());
    expect(document.activeElement?.id).toBe("results");
  });

  it("leaves focus alone without the hash", () => {
    vi.useFakeTimers();
    renderResults("q=a");
    act(() => vi.runAllTimers());
    expect(document.activeElement).toBe(document.body);
  });
});
