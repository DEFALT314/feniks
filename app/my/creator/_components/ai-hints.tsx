"use client";

import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { announce } from "@/components/ui/announcer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { focusElement } from "@/components/ui/focus";
import { HintResponse, type IdeaDraft, type IdeaField } from "@/lib/contracts/ai";
import { postJson } from "../_lib/api";

export type CardField = "tytul" | "opis" | "istota" | "dla_kogo";

export const CARD_FIELD_BY_AI_FIELD: Record<IdeaField, CardField> = {
  title: "tytul",
  description: "opis",
  essence: "istota",
  audience: "dla_kogo",
};

const LABELS: Record<CardField, string> = {
  tytul: "Tytuł",
  opis: "Opis",
  istota: "Istota",
  dla_kogo: "Dla kogo",
};

type Hint = HintResponse["hints"][number];
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; hints: Hint[] }
  | { status: "error"; message: string };

/** Short summary for the screen reader once the hints arrive; the cards themselves are not live. */
export function hintsAnnouncement(hints: Hint[]): string {
  if (hints.length === 0) return "Gotowe: asystent AI nie ma teraz podpowiedzi.";
  const fields = hints.map((h) => LABELS[CARD_FIELD_BY_AI_FIELD[h.field]]).join(", ");
  return `Gotowe: ${hints.length === 1 ? "1 podpowiedź" : `${hints.length} podpowiedzi`} od asystenta AI (${fields}). Propozycja AI.`;
}

// "Podpowiedz" (#35): AI proposes text for the card fields (P3: POST /api/ai/hints).
// Rule 5: every proposal is labelled „Propozycja AI” and changes the card only after „Użyj”.
// Accessibility: the result is announced as one short sentence (not the whole panel), and focus
// never falls to <body> when "Użyj" or "Pomiń" removes the pressed button (WCAG 4.1.3, 2.4.3).
export function AiHints({
  draft,
  onUse,
}: {
  draft: IdeaDraft;
  onUse: (field: CardField, text: string) => void;
}) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [used, setUsed] = useState<IdeaField[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const noTitle = draft.title === "";
  const noTitleId = useId();

  const ask = async () => {
    setState({ status: "loading" });
    setUsed([]);
    announce("Asystent AI przygotowuje podpowiedzi.");
    const result = await postJson("/api/ai/hints", { idea: draft }, HintResponse);
    if (result.ok) {
      setState({ status: "done", hints: result.data.hints });
      announce(hintsAnnouncement(result.data.hints));
    } else {
      setState({ status: "error", message: result.error });
      announce(result.error);
    }
  };

  const use = (field: IdeaField, text: string) => {
    onUse(CARD_FIELD_BY_AI_FIELD[field], text);
    flushSync(() => setUsed((u) => [...u, field]));
    // The pressed button is replaced by the confirmation: focus it, which also reads it out
    focusElement(document.getElementById(hintId(field, "used")));
  };

  const dismiss = (field: IdeaField) => {
    if (state.status !== "done") return;
    const rest = state.hints.filter((h) => h.field !== field);
    const index = state.hints.findIndex((h) => h.field === field);
    const next = rest[Math.min(index, rest.length - 1)];
    flushSync(() => setState({ status: "done", hints: rest }));
    // Go on to the next hint, or back to the panel heading when none is left
    if (next) focusElement(document.getElementById(hintId(next.field, "card")));
    else focusElement(headingRef.current);
    announce(`Pominięto podpowiedź: ${LABELS[CARD_FIELD_BY_AI_FIELD[field]]}.`);
  };

  return (
    <section aria-labelledby="hints-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="hints-heading" ref={headingRef} className="text-xl font-bold">
          Podpowiedzi do fiszki
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={ask}
          disabled={state.status === "loading" || noTitle}
          aria-describedby={noTitle ? noTitleId : undefined}
        >
          {state.status === "done" ? "Podpowiedz jeszcze raz" : "Podpowiedz"}
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {noTitle ? (
          <p id={noTitleId} className="text-base font-bold">
            Najpierw wpisz tytuł pomysłu.
          </p>
        ) : null}
        {state.status === "idle" ? (
          <p className="text-muted-foreground text-base">
            Asystent AI zaproponuje lepsze brzmienie pól. Nic nie zmieni się bez Twojej zgody.
          </p>
        ) : null}
        {state.status === "loading" ? (
          <p className="text-base">
            Asystent AI przygotowuje podpowiedzi. To trwa około 10 sekund.
          </p>
        ) : null}
        {state.status === "error" ? (
          <p className="text-danger text-base font-bold">{state.message}</p>
        ) : null}
        {state.status === "done" && state.hints.length === 0 ? (
          <p className="text-base">Asystent nie ma teraz podpowiedzi. Fiszka wygląda dobrze.</p>
        ) : null}
        {state.status === "done"
          ? state.hints.map((hint) => {
              const field = CARD_FIELD_BY_AI_FIELD[hint.field];
              const isUsed = used.includes(hint.field);
              return (
                <article
                  key={hint.field}
                  id={hintId(hint.field, "card")}
                  tabIndex={-1}
                  aria-label={`Propozycja AI: ${LABELS[field]}`}
                  className="border-navy-soft flex flex-col gap-2 rounded-[10px] border-2 bg-white px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{LABELS[field]}</strong>
                    <Badge variant="ai">Propozycja AI</Badge>
                  </div>
                  <p className="whitespace-pre-line">{hint.text}</p>
                  {hint.why ? <p className="text-muted-foreground text-base">{hint.why}</p> : null}
                  <div className="flex flex-wrap items-center gap-3">
                    {isUsed ? (
                      <p
                        id={hintId(hint.field, "used")}
                        tabIndex={-1}
                        className="text-success font-bold"
                      >
                        Wstawiono do pola „{LABELS[field]}”.
                      </p>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => use(hint.field, hint.text)}
                        >
                          Użyj<span className="sr-only"> w polu „{LABELS[field]}”</span>
                        </Button>
                        <Button variant="tertiary" size="sm" onClick={() => dismiss(hint.field)}>
                          Pomiń<span className="sr-only"> podpowiedź „{LABELS[field]}”</span>
                        </Button>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          : null}
      </div>
    </section>
  );
}

const hintId = (field: IdeaField, part: "card" | "used") => `hint-${field}-${part}`;
