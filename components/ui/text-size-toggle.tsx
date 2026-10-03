"use client";

import { useSyncExternalStore } from "react";
import { Button } from "./button";

// "A+": larger text and higher contrast (styles: html[data-a11y-plus] in app/globals.css).
// The choice is kept in a cookie, so the server renders the page and this button in the right state
// (app/layout.tsx), and in localStorage for pages opened before the cookie existed
// (A11Y_PLUS_SCRIPT runs before first paint). Other open tabs follow through the storage event.
export const A11Y_PLUS_COOKIE = "hubmi-a11y-plus";
const STORAGE_KEY = A11Y_PLUS_COOKIE;
const ATTRIBUTE = "data-a11y-plus";
const CHANGE_EVENT = "hubmi-a11y-plus-change";
const YEAR_SECONDS = 60 * 60 * 24 * 365;

export const A11Y_PLUS_SCRIPT = `try{if(localStorage.getItem("${STORAGE_KEY}")==="1")document.documentElement.setAttribute("${ATTRIBUTE}","")}catch(e){}`;

/** Server side: is A+ on for this request (cookie value)? */
export function a11yPlusFromCookie(value: string | undefined): boolean {
  return value === "1";
}

function apply(on: boolean) {
  document.documentElement.toggleAttribute(ATTRIBUTE, on);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY) apply(event.newValue === "1");
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function isOn() {
  return document.documentElement.hasAttribute(ATTRIBUTE);
}

export function toggleA11yPlus() {
  const on = !isOn();
  document.cookie = `${A11Y_PLUS_COOKIE}=${on ? "1" : "0"}; path=/; max-age=${YEAR_SECONDS}; samesite=lax`;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    // Storage blocked (private mode): the cookie still keeps the setting
  }
  apply(on);
}

export function TextSizeToggle({ initialOn = false }: { initialOn?: boolean }) {
  const on = useSyncExternalStore(subscribe, isOn, () => initialOn);
  // The visible "A+" is part of the accessible name, so speech users can say "kliknij A plus"
  // (WCAG 2.5.3); the rest of the name and the tooltip say what it does.
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={on}
      title="Większy tekst i wysoki kontrast"
      onClick={toggleA11yPlus}
      className="min-w-11 px-3"
    >
      A+<span className="sr-only"> większy tekst i wysoki kontrast</span>
    </Button>
  );
}
