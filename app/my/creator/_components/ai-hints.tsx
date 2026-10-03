"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

// "Podpowiedz" (#35): AI proposes text for the card fields (P3: POST /api/ai/hints).
// Rule 5: every proposal is labelled „Propozycja AI” and changes the card only after „Użyj”.
export function AiHints({
  draft,
  onUse,
}: {
  draft: IdeaDraft;
  onUse: (field: CardField, text: string) => void;
}) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [used, setUsed] = useState<IdeaField[]>([]);

  const ask = async () => {
    setState({ status: "loading" });
    setUsed([]);
    const result = await postJson("/api/ai/hints", { idea: draft }, HintResponse);
    setState(
      result.ok
        ? { status: "done", hints: result.data.hints }
        : { status: "error", message: result.error },
    );
  };

  const dismiss = (field: IdeaField) =>
    setState((s) =>
      s.status === "done" ? { status: "done", hints: s.hints.filter((h) => h.field !== field) } : s,
    );

  return (
    <section aria-labelledby="hints-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="hints-heading" className="text-xl font-bold">
          Podpowiedzi do fiszki
        </h3>
        <Button
          variant="secondary"
          size="sm"
          onClick={ask}
          disabled={state.status === "loading" || draft.title === ""}
        >
          {state.status === "done" ? "Podpowiedz jeszcze raz" : "Podpowiedz"}
        </Button>
      </div>
      <div aria-live="polite" className="flex flex-col gap-3">
        {state.status === "idle" ? (
          <p className="text-muted-foreground text-base">
            Asystent AI zaproponuje lepsze brzmienie pól. Nic nie zmieni się bez Twojej zgody.
          </p>
        ) : null}
        {state.status === "loading" ? (
          <p role="status" className="text-base">
            Asystent AI przygotowuje podpowiedzi. To trwa około 10 sekund.
          </p>
        ) : null}
        {state.status === "error" ? (
          <p role="alert" className="text-danger text-base font-bold">
            {state.message}
          </p>
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
                      <p role="status" className="text-success font-bold">
                        Wstawiono do pola „{LABELS[field]}”.
                      </p>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            onUse(field, hint.text);
                            setUsed((u) => [...u, hint.field]);
                          }}
                        >
                          Użyj
                        </Button>
                        <Button variant="tertiary" size="sm" onClick={() => dismiss(hint.field)}>
                          Pomiń
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
