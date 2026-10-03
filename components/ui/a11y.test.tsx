// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { announce, ANNOUNCE_DELAY_MS, Announcer } from "./announcer";
import { Button } from "./button";
import { Field } from "./field";
import { Input } from "./input";
import { PasswordInput } from "./password-input";
import { a11yPlusFromCookie } from "./a11y-plus";
import { TextSizeToggle, toggleA11yPlus } from "./text-size-toggle";

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
  document.documentElement.removeAttribute("data-a11y-plus");
  vi.useRealTimers();
});

describe("Announcer", () => {
  it("is mounted empty and reads each message, also the same one twice", () => {
    vi.useFakeTimers();
    act(() => root.render(<Announcer />));
    const region = container.querySelector('[role="status"]')!;
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toBe("");

    act(() => announce("Znaleźliśmy 3 propozycje"));
    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    expect(region.textContent).toBe("Znaleźliśmy 3 propozycje");

    act(() => announce("Znaleźliśmy 3 propozycje"));
    expect(region.textContent).toBe("");
    act(() => vi.advanceTimersByTime(ANNOUNCE_DELAY_MS));
    expect(region.textContent).toBe("Znaleźliśmy 3 propozycje");
  });
});

describe("Button", () => {
  it("stays focusable while disabled, so focus is not lost after submit", () => {
    const onClick = vi.fn();
    act(() =>
      root.render(
        <Button disabled onClick={onClick}>
          Zapisz
        </Button>,
      ),
    );
    const button = container.querySelector("button")!;
    expect(button.disabled).toBe(false);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    button.focus();
    act(() => button.click());
    expect(onClick).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(button);
  });
});

describe("Field", () => {
  it("marks required fields in text, not only with a symbol", () => {
    const html = renderToStaticMarkup(
      <Field label="Tytuł" required>
        {(control) => <Input required {...control} />}
      </Field>,
    );
    expect(html).toMatch(/<label[^>]*>Tytuł<span[^>]*> \(wymagane\)<\/span><\/label>/);
  });
});

describe("PasswordInput", () => {
  it("names the toggle with its visible text and no conflicting pressed state", () => {
    const html = renderToStaticMarkup(<PasswordInput id="haslo" />);
    expect(html).toMatch(/<button[^>]*>.*Pokaż.*<span class="sr-only"> hasło<\/span><\/button>/);
    expect(html).not.toContain("aria-pressed");
  });
});

describe("A+ toggle", () => {
  it("reads the cookie value", () => {
    expect(a11yPlusFromCookie("1")).toBe(true);
    expect(a11yPlusFromCookie("0")).toBe(false);
    expect(a11yPlusFromCookie(undefined)).toBe(false);
  });

  it("has the visible label in its accessible name (WCAG 2.5.3) and the server state", () => {
    const html = renderToStaticMarkup(<TextSizeToggle initialOn />);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('A+<span class="sr-only"> większy tekst i wysoki kontrast</span>');
    expect(html).not.toContain("aria-label");
  });

  it("switches the page and remembers the choice in a cookie", () => {
    act(() => root.render(<TextSizeToggle />));
    const button = container.querySelector("button")!;
    act(() => toggleA11yPlus());
    expect(document.documentElement.hasAttribute("data-a11y-plus")).toBe(true);
    expect(document.cookie).toContain("hubmi-a11y-plus=1");
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("follows a change made in another tab", () => {
    act(() => root.render(<TextSizeToggle />));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "hubmi-a11y-plus", newValue: "1" }));
    });
    expect(document.documentElement.hasAttribute("data-a11y-plus")).toBe(true);
    expect(container.querySelector("button")!.getAttribute("aria-pressed")).toBe("true");
  });
});
