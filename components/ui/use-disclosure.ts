"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** How long the panel stays painted after closing (--duration-quick, `.t-dropdown.is-closing`). */
export const CLOSE_MS = 150;

export type DisclosureState = "open" | "closing" | "closed";

/** Class for a `.t-dropdown` panel in the given state (globals.css). */
export function dropdownClass(state: DisclosureState): string {
  return state === "open"
    ? "t-dropdown is-open"
    : state === "closing"
      ? "t-dropdown is-closing"
      : "t-dropdown";
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Open/close state for a button + panel (disclosure pattern). Closes on Escape (focus goes back to
 * the button), on a click outside the wrapper and after navigating to another page. `state` adds a
 * short "closing" phase so the panel can animate out before it is hidden.
 */
export function useDisclosure<W extends HTMLElement, B extends HTMLElement>() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const wrapperRef = useRef<W>(null);
  const buttonRef = useRef<B>(null);
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState(pathname);

  // Navigating away closes the panel (state derived during render, no effect needed)
  if (open && openedOn !== pathname) setOpen(false);
  if (openedOn !== pathname) setOpenedOn(pathname);

  // Every close gets a short "closing" phase, unless the user prefers reduced motion
  if (wasOpen !== open) {
    setWasOpen(open);
    setClosing(!open && !reducedMotion());
  }

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setClosing(false), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [closing]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointer(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const state: DisclosureState = open ? "open" : closing ? "closing" : "closed";
  return { open, state, setOpen, toggle: () => setOpen((v) => !v), wrapperRef, buttonRef };
}
