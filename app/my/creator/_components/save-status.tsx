"use client";

import { useRouter } from "next/navigation";
import { useEffect, type MouseEvent } from "react";
import { announce } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { saveStatusText, type SaveStatus } from "../_lib/use-autosave";

type Autosave = {
  status: SaveStatus;
  error: string | null;
  flush: () => Promise<boolean>;
  hasUnsaved: () => boolean;
};

// "Zapisano" / "Zapisywanie…" / the error with a retry button. Only shown, not announced: typed
// fields save after every pause, and a live status would talk over the user's typing (WCAG 4.1.3).
// A failed save is announced once, because the user has to act on it.
export function SaveStatusText({ autosave }: { autosave: Autosave }) {
  const failed = autosave.status === "error";
  useEffect(() => {
    if (failed) announce(`Nie zapisano zmian. ${saveStatusText("error", autosave.error)}`);
  }, [failed, autosave.error]);
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className={failed ? "text-danger font-bold" : undefined}>
        {saveStatusText(autosave.status, autosave.error)}
      </span>
      {failed ? (
        <Button variant="tertiary" size="sm" className="px-0" onClick={autosave.flush}>
          Spróbuj ponownie
        </Button>
      ) : null}
    </span>
  );
}

/**
 * Keeps the page in step with the database:
 *  - after browser Back/Forward (which reuses a cached copy of the page) it reloads the data;
 *  - on a click on an in-app link it saves pending changes first, so the next page shows them,
 *    and stays put if saving fails (the error and "Spróbuj ponownie" are on screen).
 * Returns the onClickCapture handler for the page's root element.
 */
export function useSavedNavigation(autosave: Autosave) {
  const router = useRouter();
  useEffect(() => {
    const reload = () => router.refresh();
    window.addEventListener("popstate", reload);
    return () => window.removeEventListener("popstate", reload);
  }, [router]);

  return async (event: MouseEvent<HTMLElement>) => {
    const link = (event.target as HTMLElement).closest("a");
    if (!link || !autosave.hasUnsaved()) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target) return;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    event.stopPropagation();
    if (await autosave.flush()) router.push(url.pathname + url.search + url.hash);
  };
}
