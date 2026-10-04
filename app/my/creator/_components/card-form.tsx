"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChoiceTile } from "@/components/ui/choice-tile";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import type { IdeaArea, RankedCall } from "@/lib/ai/creator/call-fit";
import { IdeaStage } from "@/lib/contracts/ai";
import type { IdeaCardInput } from "@/lib/contracts/idea-creator";
import { cn } from "@/lib/utils";
import { saveIdeaCard } from "../actions";
import { cardHints, STAGE_LABELS } from "../_lib/canvas";
import type { MyIdea } from "../_lib/ideas";
import {
  authorStatus,
  canSubmit,
  matchDescription,
  missingForSubmission,
  toIdeaDraft,
} from "../_lib/submission";
import { useAutosave } from "../_lib/use-autosave";
import { AiAlternatives } from "./ai-alternatives";
import type { CardField } from "./ai-hints";
import { ApplicationDraft } from "./application-draft";
import { cardFieldId, IdeaReview } from "./idea-review";
import { SaveStatusText, useSavedNavigation } from "./save-status";
import { SimilarInnovation } from "./similar-innovation";
import { LockedNotice } from "./states";
import { SubmitPanel } from "./submit-panel";

// Longest text each card field accepts (lib/contracts/idea-creator.ts, Idea)
const MAX: Record<CardField, number> = { tytul: 200, opis: 3000, istota: 500, dla_kogo: 500 };

type Draft = Record<CardField, string>;

// The idea card ("fiszka", design/makiety/Fiszka.dc.html): fields saved as you type, "Sprawdź fiszkę",
// a grant application draft, a similar innovation from the ROPS Library and sending to ROPS.
export function IdeaCard({
  idea,
  calls,
  areas = [],
  justSent,
  testPanel,
}: {
  idea: MyIdea;
  calls: RankedCall[]; // fitting calls first (lib/ai/creator/call-fit.ts)
  areas?: IdeaArea[]; // Challenges Map areas of the idea, found by the search
  justSent: "first" | "again" | null; // confirmation after "Wyślij do ROPS" (?sent= in the URL)
  testPanel?: ReactNode; // "Test z mieszkańcami" from the Innovation tester (#36)
}) {
  // Local text state: the title may be empty while typing; only valid values are saved
  const [draft, setDraft] = useState<Draft>({
    tytul: idea.tytul,
    opis: idea.opis ?? "",
    istota: idea.istota ?? "",
    dla_kogo: idea.dla_kogo ?? "",
  });
  const [stage, setStage] = useState(idea.etap);
  const autosave = useAutosave<IdeaCardInput>((_key, input) => saveIdeaCard(idea.id, input));
  const hints = cardHints(idea.answers);
  const card = { ...draft, etap: stage, obszar_id: idea.obszar_id };
  const titleError = draft.tytul.trim() === "" ? "Wpisz tytuł pomysłu." : undefined;
  const status = authorStatus(idea.wyslany_at, idea.status);
  const editable = canSubmit(idea.wyslany_at, idea.status);
  const saveBeforeLeaving = useSavedNavigation(autosave);
  const missing = missingForSubmission(card);

  const change = (key: CardField, value: string, delay = 600) => {
    const text = value.slice(0, MAX[key]);
    setDraft((d) => ({ ...d, [key]: text }));
    if (key === "tytul") {
      if (text.trim() !== "") autosave.schedule(key, { tytul: text.trim() }, delay);
    } else {
      autosave.schedule(key, { [key]: text.trim() === "" ? null : text }, delay);
    }
  };

  return (
    <main id="main-content" className="flex-1" onClickCapture={saveBeforeLeaving}>
      <div className="border-border border-b bg-white">
        <div
          data-ruch="wejscie"
          className="mx-auto flex max-w-[1200px] flex-col gap-2.5 px-4 pt-8 pb-7 sm:px-10"
        >
          <Link
            href={`/my/creator/${idea.id}`}
            className="inline-flex min-h-11 items-center self-start text-base"
          >
            <span aria-hidden="true">←&nbsp;</span>Wróć do pytań
          </Link>
          <h1 className="text-[2.5rem] leading-tight font-bold">{draft.tytul || idea.tytul}</h1>
          <p className="text-muted-foreground text-base">
            {status.label} · <SaveStatusText autosave={autosave} />
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-12 px-4 pt-8 pb-16 sm:px-10">
        <section
          data-ruch="pokaz"
          aria-labelledby="card-heading"
          className="flex max-w-[700px] min-w-0 flex-[999_1_520px] flex-col gap-5"
        >
          <h2 id="card-heading" className="sr-only">
            Fiszka pomysłu w czterech krokach
          </h2>
          <StepNav sent={Boolean(idea.wyslany_at)} complete={missing.length === 0} />
          {editable ? null : <LockedNotice />}
          <CardStep
            n={1}
            id="step-describe"
            title="Opisz pomysł"
            intro="To zobaczy ROPS. Pola z dopiskiem „(wymagane)” trzeba wypełnić przed wysłaniem. Pod polami są Twoje odpowiedzi z kanwy – pomogą coś napisać. Wszystko zapisuje się samo."
          >
            <fieldset disabled={!editable} className="flex min-w-0 flex-col gap-5">
              <legend className="sr-only">Pola fiszki</legend>
              <Field label="Tytuł" error={titleError} required id={cardFieldId("title")}>
                {(control) => (
                  <Input
                    {...control}
                    maxLength={MAX.tytul}
                    value={draft.tytul}
                    required
                    onChange={(e) => change("tytul", e.target.value)}
                  />
                )}
              </Field>
              <TextField
                id={cardFieldId("description")}
                label="Opis"
                hint="Jaki problem rozwiązuje Twój pomysł i w jaki sposób?"
                rows={4}
                max={MAX.opis}
                value={draft.opis}
                onChange={(v) => change("opis", v)}
                fromCanvas={hints.opis}
                required
              />
              <TextField
                id={cardFieldId("essence")}
                label="Istota"
                hint="Jedno zdanie: co zmienia się dla ludzi."
                rows={2}
                max={MAX.istota}
                value={draft.istota}
                onChange={(v) => change("istota", v)}
                fromCanvas={hints.istota}
                required
              />
              <TextField
                id={cardFieldId("audience")}
                label="Dla kogo"
                rows={2}
                max={MAX.dla_kogo}
                value={draft.dla_kogo}
                onChange={(v) => change("dla_kogo", v)}
                fromCanvas={hints.dla_kogo}
                required
              />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 font-bold">Etap</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {IdeaStage.options.map((option) => (
                    <ChoiceTile
                      key={option}
                      size="compact"
                      name="etap"
                      value={option}
                      title={STAGE_LABELS[option]}
                      checked={stage === option}
                      onChange={() => {
                        setStage(option);
                        autosave.schedule("etap", { etap: option }, 0);
                      }}
                    />
                  ))}
                </div>
              </fieldset>
            </fieldset>
          </CardStep>

          <CardStep
            n={2}
            id="step-check"
            title="Sprawdź, co poprawić"
            intro="Asystent porówna fiszkę z Twoimi odpowiedziami z kanwy i z podobnymi innowacjami z Biblioteki ROPS. Powie, czego brakuje, gdzie to dopisać i skąd to wie. Nic nie zmieni się bez Twojego kliknięcia. Ten krok nie jest obowiązkowy."
          >
            {editable ? (
              <>
                <IdeaReview
                  ideaId={idea.id}
                  draft={toIdeaDraft(card)}
                  editable={editable}
                  onAdd={(field, sentence) =>
                    change(
                      field,
                      draft[field].trim() ? `${draft[field].trimEnd()} ${sentence}` : sentence,
                      0,
                    )
                  }
                />
                <details className="border-border rounded-xl border bg-white px-5 py-4">
                  <summary className="cursor-pointer font-bold">
                    Szukasz innego sposobu na ten sam problem? (opcjonalnie)
                  </summary>
                  <div className="mt-4">
                    <AiAlternatives
                      draft={toIdeaDraft(card)}
                      onAdd={(text) =>
                        change(
                          "opis",
                          draft.opis.trim() ? `${draft.opis.trimEnd()}\n\n${text}` : text,
                          0,
                        )
                      }
                    />
                  </div>
                </details>
              </>
            ) : (
              <p className="text-base">
                Pomysł jest w ROPS, więc tu nie ma już nic do poprawiania.
              </p>
            )}
          </CardStep>

          <CardStep
            n={3}
            id="step-funding"
            title="Przygotuj wniosek o pieniądze (opcjonalnie)"
            intro="Nabór to konkurs, w którym ROPS albo inna instytucja daje pieniądze na pomysły takie jak Twój. Wybierz nabór, a asystent ułoży szkic wniosku z fiszki i kanwy. Szkic kopiujesz do wniosku sam."
          >
            <ApplicationDraft
              calls={calls}
              areas={areas}
              draft={toIdeaDraft(card)}
              ideaId={idea.id}
            />
          </CardStep>

          <CardStep
            n={4}
            id="step-send"
            title="Wyślij do ROPS"
            intro="ROPS przeczyta fiszkę i odpowie w Wiadomościach (dostaniesz też e-mail). Po wysłaniu fiszki nie zmienisz, chyba że ROPS poprosi o poprawki."
            last
          >
            <SubmitPanel
              ideaId={idea.id}
              sentAt={idea.wyslany_at}
              status={idea.status}
              comment={idea.komentarz}
              missing={missing}
              beforeSend={autosave.flush}
              justSent={justSent}
              consent={Boolean(idea.zgoda_publikacji_at)}
              publishedAt={idea.opublikowany_at ?? null}
            />
          </CardStep>
        </section>

        <aside
          data-ruch="pokaz"
          aria-label="Podobne innowacje i test"
          className="flex max-w-[380px] flex-[1_1_320px] flex-col gap-5"
        >
          <SimilarInnovation description={matchDescription(card)} />
          {testPanel}
        </aside>
      </div>
    </main>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  hint?: ReactNode;
  rows: number;
  max: number;
  value: string;
  onChange: (value: string) => void;
  fromCanvas: string[];
  required?: boolean;
};

function TextField({
  id,
  label,
  hint,
  rows,
  max,
  value,
  onChange,
  fromCanvas,
  required,
}: TextFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Field id={id} label={label} hint={hint} required={required}>
        {(control) => (
          <Textarea
            {...control}
            required={required}
            rows={rows}
            maxLength={max}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
      </Field>
      {fromCanvas.length ? <CanvasHints label={label} items={fromCanvas} /> : null}
    </div>
  );
}

function CanvasHints({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="bg-navy-soft rounded-[10px] px-4 py-3 text-base">
      <p className="font-bold">Twoje odpowiedzi z kanwy, które pomogą wypełnić pole „{label}”:</p>
      <ul className="list-disc pl-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

const STEPS = [
  { id: "step-describe", label: "Opisz pomysł" },
  { id: "step-check", label: "Sprawdź" },
  { id: "step-funding", label: "Wniosek" },
  { id: "step-send", label: "Wyślij do ROPS" },
];

// The four steps of the card at a glance, with what is already done (like the steps of /match).
function StepNav({ sent, complete }: { sent: boolean; complete: boolean }) {
  const done = (id: string) => (id === "step-describe" && complete) || (id === "step-send" && sent);
  return (
    <nav aria-label="Kroki fiszki" className="bg-neutral-soft rounded-xl px-4 py-3">
      <ol className="flex flex-wrap gap-x-5 gap-y-2 text-base">
        {STEPS.map((step, i) => (
          <li key={step.id} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "border-navy flex size-6 items-center justify-center rounded-full border-2 text-[0.8125rem] font-bold",
                done(step.id) ? "bg-navy text-white" : "text-navy bg-white",
              )}
            >
              {done(step.id) ? "✓" : i + 1}
            </span>
            <a href={`#${step.id}`} className="no-underline hover:underline">
              {step.label}
              {done(step.id) ? <span className="sr-only"> (zrobione)</span> : null}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// One numbered step of the card: a heading, one sentence on what happens here, then the content.
function CardStep({
  n,
  id,
  title,
  intro,
  last,
  children,
}: {
  n: number;
  id: string;
  title: string;
  intro: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn(
        "relative flex scroll-mt-6 flex-col gap-4 pl-11",
        !last &&
          "pb-8 before:absolute before:top-8 before:bottom-0 before:left-[13px] before:w-0.5 before:bg-[#b8c0cd]",
      )}
      id={id}
    >
      <span
        aria-hidden="true"
        className="bg-navy absolute top-0.5 left-0 flex size-7 items-center justify-center rounded-full text-[0.9375rem] font-bold text-white"
      >
        {n}
      </span>
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-[1.5rem] leading-tight font-bold">
          <span className="sr-only">Krok {n}: </span>
          {title}
        </h2>
        <p className="text-muted-foreground text-base">{intro}</p>
      </div>
      {children}
    </section>
  );
}
