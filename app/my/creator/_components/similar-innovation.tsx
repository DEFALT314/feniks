"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { announce } from "@/components/ui/announcer";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { InnovationSummary } from "@/lib/contracts/knowledge-base";
import { MatchResponse } from "@/lib/contracts/match";
import { postJson } from "../_lib/api";

type State =
  | { status: "too-short" }
  | { status: "loading" }
  | { status: "found"; innovation: InnovationSummary }
  | { status: "none" }
  | { status: "error"; message: string };

// The match endpoint needs at least 10 characters of description
const MIN_LENGTH = 10;
// Checks while typing wait for a longer pause: /api/match allows 120 searches per hour per IP
const RECHECK_AFTER_MS = 2500;

async function findSimilar(text: string): Promise<State> {
  const result = await postJson("/api/match", { description: text, ai: false }, MatchResponse);
  if (!result.ok) return { status: "error", message: result.error };
  const best = result.data.innovations[0]?.innovation ?? result.data.more[0];
  return best ? { status: "found", innovation: best } : { status: "none" };
}

// "Coś podobnego już działa" (#35): the closest innovation from the ROPS Library, from P3's
// POST /api/match (ranking only, ai: false, so it answers in under a second).
// Checked when the card opens and again once the author stops typing (not on every keystroke).
// Not a live region: it updates while the author types the description, and reading it out would
// talk over their typing (WCAG 4.1.3). Only a newly found innovation is announced, and only when
// focus is not in a text field.
export function SimilarInnovation({ description }: { description: string }) {
  const lastChecked = useRef<string | null>(null);
  const opened = useRef(description); // the saved card, checked at once when the page opens
  const lastFound = useRef<string | null>(null);
  const [state, setState] = useState<State>({ status: "too-short" });

  useEffect(() => {
    if (description === lastChecked.current) return;
    let current = true; // a newer description makes this answer stale
    // The saved card is checked at once; typed changes wait for a pause in typing
    const delay = description === opened.current ? 0 : RECHECK_AFTER_MS;
    const timer = setTimeout(async () => {
      if (description.length < MIN_LENGTH) {
        lastChecked.current = description;
        return setState({ status: "too-short" });
      }
      lastChecked.current = null; // nothing shown until this answer arrives
      setState({ status: "loading" });
      const next = await findSimilar(description);
      if (!current) return;
      // Remember only answers that were shown; a failed check is tried again on the next change
      if (next.status !== "error") lastChecked.current = description;
      setState(next);
      if (next.status === "found" && next.innovation.id !== lastFound.current && !isTyping()) {
        announce(`Coś podobnego już działa: ${next.innovation.nazwa}.`);
      }
      if (next.status === "found") lastFound.current = next.innovation.id;
    }, delay);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [description]);

  return (
    <Card
      role="region"
      aria-labelledby="similar-heading"
      className="flex flex-col gap-2.5 p-[22px]"
    >
      <h2 id="similar-heading" className="text-muted-foreground text-base font-bold">
        Coś podobnego już działa
      </h2>
      <div className="flex flex-col gap-2.5">
        {state.status === "too-short" ? (
          <p className="text-base">
            Opisz pomysł w fiszce, a sprawdzimy, czy w Bibliotece innowacji jest coś podobnego.
          </p>
        ) : null}
        {state.status === "loading" ? <p>Szukamy w Bibliotece innowacji…</p> : null}
        {state.status === "error" ? (
          <p className="text-danger text-base font-bold">{state.message}</p>
        ) : null}
        {state.status === "none" ? (
          <p className="text-base">
            Nie znaleźliśmy podobnej innowacji. Twój pomysł może być czymś nowym.
          </p>
        ) : null}
        {state.status === "found" ? (
          <>
            <strong className="text-[1.1875rem] leading-snug">{state.innovation.nazwa}</strong>
            {state.innovation.sprawdzona_przez_rops ? (
              <Badge variant="success" className="self-start">
                Sprawdzona przez ROPS
              </Badge>
            ) : null}
            <p className="text-muted-foreground text-base">
              Zobacz ją, zanim wyślesz fiszkę. Może wystarczy zrobić to samo u siebie. A może Twój
              pomysł coś do niej doda.
            </p>
            <Link href={`/library/${state.innovation.id}`} className="font-bold">
              Zobacz kartę<span className="sr-only">: {state.innovation.nazwa}</span>
            </Link>
          </>
        ) : null}
      </div>
    </Card>
  );
}

/** True while the author is typing in a text field, when an announcement would interrupt them. */
export function isTyping(): boolean {
  const el = document.activeElement;
  return (
    el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && el.type === "text")
  );
}
