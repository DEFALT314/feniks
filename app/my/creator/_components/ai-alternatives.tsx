"use client";

import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { announce } from "@/components/ui/announcer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { focusElement } from "@/components/ui/focus";
import { AlternativesResponse, type IdeaDraft } from "@/lib/contracts/ai";
import { postJson } from "../_lib/api";

type Alternative = AlternativesResponse["alternatives"][number];
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; items: Alternative[] }
  | { status: "error"; message: string };

/** Short summary for the screen reader once the approaches arrive. */
export function alternativesAnnouncement(items: Alternative[]): string {
  if (items.length === 0) return "Gotowe: asystent AI nie ma teraz innych podejść.";
  const count = items.length === 1 ? "1 inne podejście" : `${items.length} inne podejścia`;
  return `Gotowe: ${count} od asystenta AI. Propozycja AI.`;
}

/** The text added to the "Opis" field when the author picks an approach. */
export function alternativeText(item: Alternative): string {
  return `Inne podejście – ${item.title}: ${item.text}`;
}

// "Pokaż inne podejścia" (#103): the AI assistant suggests unusual ways to solve the same problem
// (another group, partner or format). Rule 5: labelled „Propozycja AI”; the card changes only after
// "Dodaj do opisu". Results are announced as one sentence, like the hints (WCAG 4.1.3).
export function AiAlternatives({
  draft,
  onAdd,
}: {
  draft: IdeaDraft;
  onAdd: (text: string) => void;
}) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [added, setAdded] = useState<number[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reasonId = useId();
  const noDescription = draft.title === "" || draft.description === "";

  const ask = async () => {
    setState({ status: "loading" });
    setAdded([]);
    announce("Asystent AI szuka innych podejść.");
    const result = await postJson("/api/ai/alternatives", { idea: draft }, AlternativesResponse);
    if (result.ok) {
      setState({ status: "done", items: result.data.alternatives });
      announce(alternativesAnnouncement(result.data.alternatives));
    } else {
      setState({ status: "error", message: result.error });
      announce(result.error);
    }
  };

  const add = (index: number, item: Alternative) => {
    onAdd(alternativeText(item));
    flushSync(() => setAdded((a) => [...a, index]));
    // The pressed button is replaced by the confirmation: focus it, which also reads it out
    focusElement(document.getElementById(`alternative-${index}-added`));
  };

  return (
    <section aria-labelledby="alternatives-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="alternatives-heading" ref={headingRef} className="text-xl font-bold">
          Inne podejścia
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={ask}
          disabled={state.status === "loading" || noDescription}
          aria-describedby={noDescription ? reasonId : undefined}
        >
          {state.status === "done" ? "Pokaż inne podejścia jeszcze raz" : "Pokaż inne podejścia"}
        </Button>
      </div>
      {noDescription ? (
        <p id={reasonId} className="text-base font-bold">
          Najpierw wpisz tytuł i opis pomysłu.
        </p>
      ) : null}
      {state.status === "idle" ? (
        <p className="text-muted-foreground text-base">
          Asystent AI podsunie nietuzinkowe sposoby rozwiązania tego samego problemu: z innym
          partnerem, w innej formie albo z pomocą innych osób. Możesz z nich skorzystać albo nie.
        </p>
      ) : null}
      {state.status === "loading" ? (
        <p className="text-base">Asystent AI szuka innych podejść. To trwa około 10 sekund.</p>
      ) : null}
      {state.status === "error" ? (
        <div className="flex flex-col gap-1 text-base">
          <p className="text-danger font-bold">{state.message}</p>
          <p>Asystent jest tylko pomocą. Fiszkę możesz wysłać do ROPS bez niego.</p>
        </div>
      ) : null}
      {state.status === "done" && state.items.length === 0 ? (
        <p className="text-base">Asystent nie ma teraz innych podejść. Spróbuj później.</p>
      ) : null}
      {state.status === "done"
        ? state.items.map((item, index) => (
            <article
              key={`${index}-${item.title}`}
              aria-label={`Propozycja AI: ${item.title}`}
              className="border-navy-soft flex flex-col gap-2 rounded-[10px] border-2 bg-white px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{item.title}</strong>
                <Badge variant="ai">Propozycja AI</Badge>
              </div>
              <p>{item.text}</p>
              {item.why ? <p className="text-muted-foreground text-base">{item.why}</p> : null}
              {added.includes(index) ? (
                <p
                  id={`alternative-${index}-added`}
                  tabIndex={-1}
                  className="text-success font-bold"
                >
                  Dodano do pola „Opis”.
                </p>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  onClick={() => add(index, item)}
                >
                  Dodaj do opisu<span className="sr-only">: {item.title}</span>
                </Button>
              )}
            </article>
          ))
        : null}
    </section>
  );
}
