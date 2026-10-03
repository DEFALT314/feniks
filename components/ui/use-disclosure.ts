"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Open/close state for a button + panel (disclosure pattern). Closes on Escape (focus goes back to
 * the button), on a click outside the wrapper and after navigating to another page.
 */
export function useDisclosure<W extends HTMLElement, B extends HTMLElement>() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<W>(null);
  const buttonRef = useRef<B>(null);
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState(pathname);

  // Navigating away closes the panel (state derived during render, no effect needed)
  if (open && openedOn !== pathname) setOpen(false);
  if (openedOn !== pathname) setOpenedOn(pathname);

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

  return { open, setOpen, toggle: () => setOpen((v) => !v), wrapperRef, buttonRef };
}
