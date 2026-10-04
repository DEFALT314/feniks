"use client";

import { useEffect } from "react";
import { focusElement } from "@/components/ui/focus";

// When the URL ends with `#hash` (a filter form or a link that jumps to the results), move focus to
// `targetId` and not only scroll there, so keyboard and screen-reader users land on the new content
// (WCAG 2.4.3). Runs on load and every time `changeKey` changes (another page or area).
export function HashFocus({
  hash,
  targetId,
  changeKey,
}: {
  hash: string;
  targetId: string;
  changeKey: string;
}) {
  useEffect(() => {
    if (window.location.hash !== `#${hash}`) return;
    // Wait one tick: after a client navigation the layout moves focus to the h1 in its own effect
    const timer = setTimeout(() => focusElement(document.getElementById(targetId)), 0);
    return () => clearTimeout(timer);
  }, [hash, targetId, changeKey]);
  return null;
}
