"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { announce } from "@/components/ui/announcer";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { focusElement } from "@/components/ui/focus";
import {
  ReviewResponse,
  type IdeaDraft,
  type IdeaField,
  type ReviewCheck,
} from "@/lib/contracts/ai";
import { cn } from "@/lib/utils";
import { postJson } from "../_lib/api";
import { CARD_FIELD_BY_AI_FIELD, type CardField } from "./ai-hints";

// "Sprawdź fiszkę" (P3: POST /api/ai/review). Instead of rewording the card it says what to change
// and where, each point with its evidence: the author's own canvas answer or a similar innovation
// from the ROPS Library (with a verbatim quote). Points from the data are labelled „Z Twoich
// odpowiedzi”, the model's ones „Propozycja AI” (rule 5); the card changes only after a click.

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; review: ReviewResponse }
  | { status: "error"; message: string };

export const FIELD_LABELS: Record<IdeaField, string> = {
  title: "Tytuł",
  description: "Opis",
  essence: "Istota",
  audience: "Dla kogo",
};

/** Id of the card's form control for a field, so "Przejdź do pola" can focus it. */
export const cardFieldId = (field: IdeaField) => `card-field-${field}`;

const GROUPS: {
  kind: ReviewCheck["kind"];
  title: string;
  badge: "warning" | "neutral" | "success";
}[] = [
  { kind: "brakuje", title: "Brakuje", badge: "warning" },
  { kind: "do_przemyslenia", title: "Do przemyślenia", badge: "neutral" },
  { kind: "mocna_strona", title: "Mocne strony – powiedz to wprost", badge: "success" },
];

const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;

/** One sentence that sums up the review, shown on top and read out to screen readers. */
export function reviewSummary(checks: ReviewCheck[]): string {
  const count = (kind: ReviewCheck["kind"]) => checks.filter((c) => c.kind === kind).length;
  const missing = count("brakuje");
  const think = count("do_przemyslenia");
  const strong = count("mocna_strona");
  if (!missing && !think) {
    return strong
      ? "Fiszka jest kompletna. Zobacz, co warto podkreślić."
      : "Fiszka jest kompletna. Nie mamy uwag.";
  }
  const parts = [
    missing ? `${missing} ${plural(missing, "brak", "braki", "braków")}` : null,
    think ? `${think} ${plural(think, "rzecz", "rzeczy", "rzeczy")} do przemyślenia` : null,
    strong ? `${strong} ${plural(strong, "mocna strona", "mocne strony", "mocnych stron")}` : null,
  ].filter(Boolean);
  return `Do poprawy: ${parts.join(", ")}.`;
}

function Evidence({ check }: { check: ReviewCheck }) {
  const s = check.source;
  return (
    <div className="border-border flex flex-col gap-1 border-l-2 pl-3 text-base">
      <span className="text-muted-foreground font-bold">Skąd to wiemy</span>
      {s.kind === "kanwa" ? (
        <span>
          Twoja kanwa, pytanie „{s.label}”: <q>{s.answer}</q>
        </span>
      ) : null}
      {s.kind === "fiszka" ? <span>Twoja fiszka, pole „{FIELD_LABELS[s.field]}”.</span> : null}
      {s.kind === "biblioteka" ? (
        <>
          <span>
            Biblioteka ROPS:{" "}
            <Link href={`/library/${s.innovation_id}`} className="font-bold">
              {s.name}
            </Link>
          </span>
          {s.quote ? <q className="text-muted-foreground italic">{s.quote}</q> : null}
        </>
      ) : null}
    </div>
  );
}

function CheckCard({
  check,
  ideaId,
  editable,
  added,
  onAdd,
  onDismiss,
}: {
  check: ReviewCheck;
  ideaId: string;
  editable: boolean;
  added: boolean;
  onAdd: () => void;
  onDismiss: () => void;
}) {
  const label = check.field ? FIELD_LABELS[check.field] : null;
  return (
    <article
      aria-labelledby={`check-${check.id}`}
      className={cn(
        "flex flex-col gap-2.5 rounded-[10px] border-2 bg-white px-4 py-3",
        check.kind === "brakuje" && "border-warning-soft",
        check.kind === "do_przemyslenia" && "border-navy-soft",
        check.kind === "mocna_strona" && "border-success-soft",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h5 id={`check-${check.id}`} className="text-lg leading-snug font-bold">
          {check.title}
        </h5>
        {check.ai ? <Badge variant="ai">Propozycja AI</Badge> : <Badge>Z Twoich odpowiedzi</Badge>}
      </div>
      <p>{check.detail}</p>
      <Evidence check={check} />
      {check.suggestion && label && editable ? (
        <div className="bg-navy-soft rounded-[10px] px-3 py-2 text-base">
          <span className="font-bold">Możesz dopisać do pola „{label}”: </span>
          <q>{check.suggestion}</q>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {added ? (
          <p id={`check-${check.id}-added`} tabIndex={-1} className="text-success font-bold">
            Dopisano do pola „{label}”.
          </p>
        ) : null}
        {check.suggestion && label && editable && !added ? (
          <Button variant="secondary" size="sm" onClick={onAdd}>
            Dopisz zdanie<span className="sr-only"> do pola „{label}”</span>
          </Button>
        ) : null}
        {label && editable ? (
          <Button
            variant="tertiary"
            size="sm"
            onClick={() =>
              focusElement(document.getElementById(cardFieldId(check.field as IdeaField)))
            }
          >
            Przejdź do pola „{label}”
          </Button>
        ) : null}
        {check.step && editable ? (
          <Link
            href={`/my/creator/${ideaId}?step=${check.step}`}
            className={buttonVariants({ variant: "tertiary", size: "sm" })}
          >
            Popraw w kanwie
          </Link>
        ) : null}
        <Button variant="tertiary" size="sm" onClick={onDismiss}>
          {check.kind === "mocna_strona" ? "Rozumiem" : "Pomiń"}
          <span className="sr-only">: {check.title}</span>
        </Button>
      </div>
    </article>
  );
}

export function IdeaReview({
  ideaId,
  draft,
  editable,
  onAdd,
}: {
  ideaId: string;
  draft: IdeaDraft;
  editable: boolean;
  onAdd: (field: CardField, sentence: string) => void;
}) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const tooShort = draft.title === "" || draft.description.length < 10;

  const ask = async () => {
    setState({ status: "loading" });
    setDismissed([]);
    setAdded([]);
    announce("Sprawdzamy fiszkę.");
    const result = await postJson(
      "/api/ai/review",
      { idea: draft, idea_id: ideaId },
      ReviewResponse,
    );
    if (!result.ok) {
      setState({ status: "error", message: result.error });
      announce(result.error);
      return;
    }
    flushSync(() => setState({ status: "done", review: result.data }));
    announce(reviewSummary(result.data.checks));
  };

  const add = (check: ReviewCheck) => {
    if (!check.field || !check.suggestion) return;
    onAdd(CARD_FIELD_BY_AI_FIELD[check.field], check.suggestion);
    flushSync(() => setAdded((a) => [...a, check.id]));
    focusElement(document.getElementById(`check-${check.id}-added`));
  };

  const dismiss = (check: ReviewCheck) => {
    flushSync(() => setDismissed((d) => [...d, check.id]));
    focusElement(summaryRef.current);
  };

  const review = state.status === "done" ? state.review : null;
  const visible = review ? review.checks.filter((c) => !dismissed.includes(c.id)) : [];
  const p = review?.progress;

  return (
    <section
      aria-labelledby="review-heading"
      className="border-navy-soft flex flex-col gap-4 rounded-xl border-2 bg-white p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="review-heading" className="text-xl font-bold">
          Sprawdź fiszkę
        </h3>
        <Button
          variant={review ? "secondary" : "primary"}
          size="sm"
          onClick={ask}
          disabled={state.status === "loading" || tooShort}
        >
          {review ? "Sprawdź jeszcze raz" : "Sprawdź fiszkę"}
        </Button>
      </div>

      {state.status === "idle" ? (
        <p className="text-muted-foreground text-base">
          {tooShort
            ? "Najpierw wpisz tytuł i opis pomysłu."
            : "Porównamy fiszkę z Twoimi odpowiedziami z kanwy i z podobnymi innowacjami z Biblioteki ROPS. Dowiesz się, co dopisać, gdzie i dlaczego. Nic nie zmieni się bez Twojej zgody."}
        </p>
      ) : null}
      {state.status === "loading" ? (
        <p className="text-base">
          Sprawdzamy fiszkę, kanwę i podobne innowacje. To trwa kilka sekund.
        </p>
      ) : null}
      {state.status === "error" ? (
        <div className="flex flex-col gap-1 text-base">
          <p className="text-danger font-bold">{state.message}</p>
          <p>Sprawdzenie jest tylko pomocą. Fiszkę możesz wysłać do ROPS bez niego.</p>
        </div>
      ) : null}

      {review && p ? (
        <>
          <dl className="grid grid-cols-2 gap-3 text-base">
            <div className="bg-neutral-soft rounded-[10px] px-3 py-2">
              <dt className="text-muted-foreground">Fiszka</dt>
              <dd className="font-bold">
                {p.card_filled} z {p.card_total} pól
              </dd>
            </div>
            <div className="bg-neutral-soft rounded-[10px] px-3 py-2">
              <dt className="text-muted-foreground">Kanwa</dt>
              <dd className="font-bold">
                {p.canvas_answered} z {p.canvas_total} pytań
                {p.canvas_answered < p.canvas_total && editable ? (
                  <>
                    {" · "}
                    <Link href={`/my/creator/${ideaId}`} className="font-normal">
                      dokończ
                    </Link>
                  </>
                ) : null}
              </dd>
            </div>
          </dl>
          <p ref={summaryRef} tabIndex={-1} className="font-bold">
            {visible.length ? reviewSummary(visible) : "Wszystkie uwagi przejrzane."}
          </p>
          {GROUPS.map((group) => {
            const items = visible.filter((c) => c.kind === group.kind);
            if (!items.length) return null;
            return (
              <section
                key={group.kind}
                aria-labelledby={`review-${group.kind}`}
                className="flex flex-col gap-3"
              >
                <h4 id={`review-${group.kind}`} className="flex items-center gap-2 font-bold">
                  <Badge variant={group.badge}>{items.length}</Badge>
                  {group.title}
                </h4>
                {items.map((check) => (
                  <CheckCard
                    key={check.id}
                    check={check}
                    ideaId={ideaId}
                    editable={editable}
                    added={added.includes(check.id)}
                    onAdd={() => add(check)}
                    onDismiss={() => dismiss(check)}
                  />
                ))}
              </section>
            );
          })}
        </>
      ) : null}
    </section>
  );
}
