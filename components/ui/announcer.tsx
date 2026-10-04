"use client";

import { useEffect, useState } from "react";

// One polite live region for the whole app (WCAG 4.1.3). A region has to exist before its text
// changes, so components call `announce("…")` instead of mounting their own region next to new
// content. Keep messages short: "Znaleźliśmy 3 propozycje", not the whole answer.
export const ANNOUNCE_EVENT = "hubmi-announce";

/** Dispatch only: <Announcer /> (mounted in app/layout.tsx) reads it out once. */
export function announce(message: string) {
  window.dispatchEvent(new CustomEvent<string>(ANNOUNCE_EVENT, { detail: message }));
}

/** Delay between clearing the region and setting the text, so the same message is read again. */
export const ANNOUNCE_DELAY_MS = 100;

export function Announcer() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function onAnnounce(event: Event) {
      const text = (event as CustomEvent<string>).detail;
      setMessage("");
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(text), ANNOUNCE_DELAY_MS);
    }
    window.addEventListener(ANNOUNCE_EVENT, onAnnounce);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(ANNOUNCE_EVENT, onAnnounce);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
