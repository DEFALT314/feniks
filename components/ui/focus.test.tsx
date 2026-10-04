// @vitest-environment happy-dom
import { act, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { focusElement, focusFirstError, useFocusFirstError, useFocusOnChange } from "./focus";
import { pageStart } from "./route-focus";

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
});

describe("focusElement", () => {
  it("makes a heading programmatically focusable without adding a Tab stop", () => {
    container.innerHTML = "<h2>Krok 2</h2>";
    const heading = container.querySelector("h2")!;
    expect(focusElement(heading)).toBe(true);
    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(heading);
  });

  it("leaves native controls as they are", () => {
    container.innerHTML = "<button>Dalej</button>";
    const button = container.querySelector("button")!;
    expect(focusElement(button)).toBe(true);
    expect(button.hasAttribute("tabindex")).toBe(false);
  });

  it("returns false for a missing element", () => {
    expect(focusElement(null)).toBe(false);
  });
});

describe("focusFirstError", () => {
  it("focuses the first invalid field", () => {
    container.innerHTML = `<form>
      <input id="a" /><input id="b" aria-invalid="true" /><input id="c" aria-invalid="true" />
    </form>`;
    expect(focusFirstError(container)).toBe(true);
    expect(document.activeElement?.id).toBe("b");
  });

  it("falls back to the form-level message", () => {
    container.innerHTML = `<form><p data-form-error>Nie udało się zalogować.</p><input /></form>`;
    expect(focusFirstError(container)).toBe(true);
    expect(document.activeElement?.textContent).toBe("Nie udało się zalogować.");
  });

  it("does nothing when there is no error", () => {
    container.innerHTML = `<form><input /></form>`;
    expect(focusFirstError(container)).toBe(false);
  });
});

function ErrorForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<{ error: string } | undefined>();
  useFocusFirstError(ref, result);
  return (
    <form ref={ref}>
      <input id="email" aria-invalid={result ? true : undefined} />
      <button type="button" onClick={() => setResult({ error: "Wpisz adres" })}>
        Zaloguj
      </button>
    </form>
  );
}

describe("useFocusFirstError", () => {
  it("moves focus from the submit button to the invalid field after each failed submit", () => {
    act(() => root.render(<ErrorForm />));
    const button = container.querySelector("button")!;
    button.focus();
    act(() => button.click());
    expect(document.activeElement?.id).toBe("email");
    // A second failed submit (a new result object) moves focus again
    button.focus();
    act(() => button.click());
    expect(document.activeElement?.id).toBe("email");
  });

  it("leaves focus alone on first render", () => {
    act(() => root.render(<ErrorForm />));
    expect(document.activeElement).toBe(document.body);
  });
});

function Steps() {
  const ref = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(1);
  useFocusOnChange(ref, step);
  return (
    <>
      <h2 ref={ref}>Krok {step}</h2>
      <button onClick={() => setStep((s) => s + 1)}>Dalej</button>
    </>
  );
}

describe("useFocusOnChange", () => {
  it("does not steal focus on first render, then follows every change", () => {
    act(() => root.render(<Steps />));
    expect(document.activeElement).toBe(document.body);
    act(() => container.querySelector("button")!.click());
    expect(document.activeElement?.textContent).toBe("Krok 2");
  });
});

describe("pageStart", () => {
  it("prefers the h1 inside main, then main itself", () => {
    document.body.innerHTML = `<main id="main-content"><h1>Biblioteka</h1></main>`;
    expect(pageStart()?.tagName).toBe("H1");
    document.body.innerHTML = `<main id="main-content"><p>…</p></main>`;
    expect(pageStart()?.tagName).toBe("MAIN");
  });

  it("respects a #hash target such as /library#results", () => {
    document.body.innerHTML = `<main id="main-content"><h1>Biblioteka</h1><h2 id="results">12 wyników</h2></main>`;
    window.location.hash = "#results";
    expect(pageStart()?.id).toBe("results");
    window.location.hash = "";
  });
});
