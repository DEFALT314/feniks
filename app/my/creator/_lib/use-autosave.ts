"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
type Result = { ok: true } | { ok: false; error: string };

const OFFLINE = "Brak połączenia. Zmiany nie zostały zapisane.";

/**
 * Saves changes through a server action. Each key (a canvas field, a card field) keeps only its
 * latest value; text waits `delay` ms after the last keystroke, choices pass delay 0.
 * A failed save is kept and retried by flush() (before sending to ROPS or leaving the page) and by
 * retry(); the error stays on screen until every change is saved.
 */
export function useAutosave<T>(save: (key: string, value: T) => Promise<Result>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(new Map<string, { value: T; timer: ReturnType<typeof setTimeout> }>());
  const failed = useRef(new Map<string, { value: T; error: string }>());
  const inFlight = useRef(0);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const refresh = useCallback(() => {
    const firstFailure = failed.current.values().next().value;
    if (firstFailure) {
      setError(firstFailure.error);
      setStatus("error");
    } else if (inFlight.current > 0 || pending.current.size > 0) {
      setStatus("saving");
    } else {
      setError(null);
      setStatus("saved");
    }
  }, []);

  const run = useCallback(
    async (key: string, value: T) => {
      inFlight.current += 1;
      setStatus("saving");
      let result: Result;
      try {
        result = await saveRef.current(key, value);
      } catch {
        result = { ok: false, error: OFFLINE };
      }
      inFlight.current -= 1;
      // A newer value for the same key replaces this one, whatever happened to it
      if (!pending.current.has(key)) {
        if (result.ok) failed.current.delete(key);
        else failed.current.set(key, { value, error: result.error });
      }
      refresh();
      return result.ok;
    },
    [refresh],
  );

  const schedule = useCallback(
    (key: string, value: T, delay = 600) => {
      const previous = pending.current.get(key);
      if (previous) clearTimeout(previous.timer);
      failed.current.delete(key);
      const timer = setTimeout(() => {
        pending.current.delete(key);
        void run(key, value);
      }, delay);
      pending.current.set(key, { value, timer });
      setStatus("saving");
    },
    [run],
  );

  /** Saves everything waiting or failed now; true when all of it is saved. */
  const flush = useCallback(async () => {
    const entries = new Map<string, T>();
    for (const [key, { value }] of failed.current) entries.set(key, value);
    for (const [key, { value, timer }] of pending.current) {
      clearTimeout(timer);
      entries.set(key, value);
    }
    pending.current.clear();
    failed.current.clear();
    const results = await Promise.all([...entries].map(([key, value]) => run(key, value)));
    return results.every(Boolean);
  }, [run]);

  const hasUnsaved = useCallback(
    () => pending.current.size > 0 || failed.current.size > 0 || inFlight.current > 0,
    [],
  );

  // Leaving the page with unsaved changes: save them (best effort) instead of losing them
  useEffect(() => {
    const waiting = pending.current;
    const broken = failed.current;
    return () => {
      for (const [key, { value, timer }] of waiting) {
        clearTimeout(timer);
        void saveRef.current(key, value);
      }
      for (const [key, { value }] of broken) void saveRef.current(key, value);
      waiting.clear();
      broken.clear();
    };
  }, []);

  return { status, error, schedule, flush, hasUnsaved };
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
