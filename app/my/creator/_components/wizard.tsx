"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useFocusOnChange } from "@/components/ui/focus";
import { Steps } from "@/components/ui/steps";
import type { CanvasAnswer, CanvasField, IdeaWithCanvas } from "@/lib/contracts/idea-creator";
import { saveCanvasAnswer } from "../actions";
import { answeredCount, fields, sectionOf, sections, stepIndex, stepLabel } from "../_lib/canvas";
import { useAutosave } from "../_lib/use-autosave";
import { LockedNotice } from "./states";
import { SaveStatusText, useSavedNavigation } from "./save-status";
import { Question } from "./question";

const stepHref = (ideaId: string, fieldId: string) => `/my/creator/${ideaId}?step=${fieldId}`;

// Choices save at once; typed text waits for a pause in typing
const TYPED: CanvasField["typ"][] = ["tekst_lista", "jeden_wybor_plus_tekst", "lista_partnerow"];

// The canvas wizard: one question per screen, saved after every change (design/makiety/Kreator.dc.html)
export function Wizard({
  idea,
  stepId,
  editable,
}: {
  idea: IdeaWithCanvas;
  stepId: string | undefined;
  editable: boolean; // false while ROPS has the idea
}) {
  const ideaId = idea.id;
  const [answers, setAnswers] = useState(idea.answers);
  const autosave = useAutosave<CanvasAnswer>((fieldId, answer) =>
    saveCanvasAnswer(ideaId, fieldId, answer),
  );

  const index = stepIndex(stepId);
  const field = fields[index];
  // "Dalej", "Wstecz" and the section links keep the page mounted, so focus would stay on the
  // pressed link: move it to the new question instead (WCAG 2.4.3)
  const questionHeading = useRef<HTMLHeadingElement>(null);
  useFocusOnChange(questionHeading, field.id);
  const previous = fields[index - 1];
  const next = fields[index + 1];
  const cardHref = `/my/creator/${ideaId}/card`;
  const save = (answer: CanvasAnswer) => {
    setAnswers((current) => ({ ...current, [field.id]: answer }));
    const typed = TYPED.includes(field.typ) || ("other" in answer && answer.other !== undefined);
    autosave.schedule(field.id, answer, typed ? 600 : 0);
  };
  const saveBeforeLeaving = useSavedNavigation(autosave);

  return (
    <main id="main-content" className="flex-1" onClickCapture={saveBeforeLeaving}>
      <div className="border-border border-b bg-white">
        <div
          data-ruch="wejscie"
          className="mx-auto flex max-w-[1200px] flex-col gap-2.5 px-4 py-5 sm:px-10"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="font-sans text-2xl leading-tight font-bold">Pomysł: {idea.tytul}</h1>
            <p className="text-muted-foreground text-base">
              {stepLabel(index)} · <SaveStatusText autosave={autosave} />
            </p>
          </div>
          <div
            data-ruch="postep"
            role="progressbar"
            aria-label="Postęp kreatora"
            aria-valuemin={1}
            aria-valuemax={fields.length}
            aria-valuenow={index + 1}
            aria-valuetext={stepLabel(index)}
            className="bg-neutral-soft h-2 overflow-hidden rounded-full"
          >
            <div
              className="bg-navy h-full transition-[width] duration-(--duration-slow) motion-reduce:transition-none"
              style={{ width: `${((index + 1) / fields.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-10 px-4 pt-8 pb-16 sm:px-10">
        <div className="flex max-w-[250px] flex-[1_1_220px] flex-col gap-1.5">
          <p className="text-muted-foreground text-base font-bold">Kanwa innowacji</p>
          <Steps
            label="Części kanwy"
            currentId={sectionOf(field.id)?.id ?? ""}
            steps={sections.map((section) => ({
              id: section.id,
              label: section.label,
              href: stepHref(ideaId, section.fields[0].id),
              done: answeredCount(section.fields, answers),
              total: section.fields.length,
            }))}
          />
          <Link href={cardHref} className="mt-3 inline-flex min-h-11 items-center font-bold">
            Podgląd fiszki
          </Link>
        </div>

        <section
          data-ruch="pokaz"
          aria-label="Pytanie"
          className="flex max-w-[680px] min-w-0 flex-[999_1_480px] flex-col gap-6"
        >
          {/* key: a new question starts with fresh local state (partners list) */}
          {editable ? null : <LockedNotice />}
          <Question
            key={field.id}
            field={field}
            answer={answers[field.id]}
            onChange={save}
            disabled={!editable}
            headingRef={questionHeading}
          />

          <nav
            aria-label="Nawigacja kreatora"
            className="border-border flex flex-wrap items-center gap-3 border-t pt-5"
          >
            {previous ? (
              <Link
                href={stepHref(ideaId, previous.id)}
                className={buttonVariants({ variant: "secondary" })}
              >
                Wstecz
              </Link>
            ) : null}
            {next ? (
              <Link
                href={stepHref(ideaId, next.id)}
                className={buttonVariants({ variant: "tertiary" })}
              >
                Pomiń pytanie
              </Link>
            ) : null}
            <Link
              href={next ? stepHref(ideaId, next.id) : cardHref}
              className={buttonVariants({ variant: "primary", className: "ml-auto" })}
            >
              {next ? "Dalej" : "Przejdź do fiszki"}
            </Link>
          </nav>
        </section>
      </div>
    </main>
  );
}
