"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
type Result = { ok: true } | { ok: false; error: string };

/**
 * Saves changes through a server action. Each key (a canvas field, a card field) keeps only its
 * latest value; text waits `delay` ms after the last keystroke, choices pass delay 0.
 * flush() saves everything pending at once (before sending to ROPS or leaving the step).
 */
export function useAutosave<T>(save: (key: string, value: T) => Promise<Result>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(new Map<string, { value: T; timer: ReturnType<typeof setTimeout> }>());
  const inFlight = useRef(0);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const run = useCallback(async (key: string, value: T) => {
    inFlight.current += 1;
    setStatus("saving");
    let result: Result;
    try {
      result = await saveRef.current(key, value);
    } catch {
      result = { ok: false, error: "Brak połączenia. Zmiany nie zostały zapisane." };
    }
    inFlight.current -= 1;
    if (!result.ok) {
      setError(result.error);
      setStatus("error");
    } else if (inFlight.current === 0 && pending.current.size === 0) {
      setError(null);
      setStatus("saved");
    }
    return result.ok;
  }, []);

  const schedule = useCallback(
    (key: string, value: T, delay = 600) => {
      const previous = pending.current.get(key);
      if (previous) clearTimeout(previous.timer);
      const timer = setTimeout(() => {
        pending.current.delete(key);
        void run(key, value);
      }, delay);
      pending.current.set(key, { value, timer });
      setStatus("saving");
    },
    [run],
  );

  const flush = useCallback(async () => {
    const entries = [...pending.current.entries()];
    pending.current.clear();
    const results = await Promise.all(
      entries.map(([key, { value, timer }]) => {
        clearTimeout(timer);
        return run(key, value);
      }),
    );
    return results.every(Boolean);
  }, [run]);

  // Leaving the page with unsaved text: save it (best effort) instead of losing it
  useEffect(() => {
    const map = pending.current;
    return () => {
      for (const [key, { value, timer }] of map) {
        clearTimeout(timer);
        void saveRef.current(key, value);
      }
      map.clear();
    };
  }, []);

  return { status, error, schedule, flush };
}

export function saveStatusText(status: SaveStatus, error: string | null): string {
  switch (status) {
    case "saving":
      return "Zapisywanie…";
    case "saved":
      return "Zapisano";
    case "error":
      return error ?? "Nie udało się zapisać.";
    default:
      return "Zapisuje się automatycznie";
  }
}
