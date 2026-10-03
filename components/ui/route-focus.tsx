"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { focusElement } from "./focus";

const MAIN = "main-content";

/** The page's h1, or <main> when a page has none. */
export function pageStart(doc: Document = document): HTMLElement | null {
  const main = doc.getElementById(MAIN);
  return main?.querySelector<HTMLElement>("h1") ?? main;
}

// After a client-side navigation focus stays on the clicked link of the previous page. Move it to
// the new page's heading, so keyboard users start at the content and screen readers read the title
// (WCAG 2.4.3). The first load is left alone.
export function RouteFocus() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    focusElement(pageStart());
  }, [pathname]);
  return null;
}

// "Przejdź do treści": a plain #anchor scrolls but leaves focus where it was in some browsers, so
// the next Tab goes back into the menu. Move focus to <main> explicitly (WCAG 2.4.1).
export function SkipLink() {
  return (
    <a
      href={`#${MAIN}`}
      onClick={(event) => {
        if (focusElement(document.getElementById(MAIN))) event.preventDefault();
      }}
      className="sr-only z-50 rounded-[10px] bg-white px-4 py-3 font-bold focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
    >
      Przejdź do treści
    </a>
  );
}
