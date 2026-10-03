"use client";

import { useSyncExternalStore } from "react";
import { Button } from "./button";

// "A+": larger text and higher contrast (styles: html[data-a11y-plus] in app/globals.css).
// The choice is remembered in localStorage and restored before first paint by A11Y_PLUS_SCRIPT.
const STORAGE_KEY = "hubmi-a11y-plus";
const ATTRIBUTE = "data-a11y-plus";
const CHANGE_EVENT = "hubmi-a11y-plus-change";

export const A11Y_PLUS_SCRIPT = `try{if(localStorage.getItem("${STORAGE_KEY}")==="1")document.documentElement.setAttribute("${ATTRIBUTE}","")}catch(e){}`;

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function isOn() {
  return document.documentElement.hasAttribute(ATTRIBUTE);
}

function toggle() {
  const on = !isOn();
  document.documentElement.toggleAttribute(ATTRIBUTE, on);
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    // Storage blocked (private mode): the setting lasts until the page is reloaded
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function TextSizeToggle() {
  const on = useSyncExternalStore(subscribe, isOn, () => false);
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={on}
      aria-label="Większy tekst i wysoki kontrast"
      onClick={toggle}
      className="min-w-11 px-3"
    >
      A+
    </Button>
  );
}
