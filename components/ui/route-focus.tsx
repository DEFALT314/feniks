"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { focusElement } from "./focus";

const MAIN = "main-content";

/** The #hash target when the URL has one, else the page's h1, else <main>. */
export function pageStart(doc: Document = document): HTMLElement | null {
  const hash = decodeURIComponent(doc.location?.hash.slice(1) ?? "");
  const target = hash ? doc.getElementById(hash) : null;
  if (target) return target;
  const main = doc.getElementById(MAIN);
  return main?.querySelector<HTMLElement>("h1") ?? main;
}

// After a client-side navigation focus stays on the clicked link of the previous page. Move it to
// the new page's heading, so keyboard users start at the content and screen readers read the title
// (WCAG 2.4.3). The first load is left alone: comparing paths, not a "first run" flag, because
// Strict Mode runs effects twice and focusing the heading on load scrolls the header away.
export function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
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
