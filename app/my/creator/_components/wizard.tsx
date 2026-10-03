"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Steps } from "@/components/ui/steps";
import type { CanvasAnswer } from "@/lib/contracts/idea-creator";
import { answeredCount, fieldIndex, fields, sectionOf, sections } from "../_lib/canvas";
import { ideaStore, useIdea } from "../_lib/use-ideas";
import { IdeaNotFound, Loading } from "./states";
import { Question } from "./question";

const stepHref = (ideaId: string, fieldId: string) => `/my/creator/${ideaId}?step=${fieldId}`;

// The canvas wizard: one question per screen, saved after every change (design/makiety/Kreator.dc.html)
export function Wizard({ ideaId, stepId }: { ideaId: string; stepId: string | undefined }) {
  const idea = useIdea(ideaId);
  if (idea === null) return <Loading />;
  if (idea === undefined) return <IdeaNotFound />;

  const index = Math.max(0, stepId ? fieldIndex(stepId) : 0);
  const field = fields[index];
  const previous = fields[index - 1];
  const next = fields[index + 1];
  const cardHref = `/my/creator/${ideaId}/card`;
  const save = (answer: CanvasAnswer) => ideaStore().saveAnswer(ideaId, field.id, answer);

  return (
    <main id="main-content" className="flex-1">
      <div className="border-border border-b bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2.5 px-4 py-5 sm:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="font-sans text-lg font-bold">Pomysł: {idea.tytul}</h1>
            <p className="text-muted-foreground text-base">
              Krok {index + 1} z {fields.length} · zapisuje się automatycznie
            </p>
          </div>
          <div
            role="progressbar"
            aria-label="Postęp kreatora"
            aria-valuemin={1}
            aria-valuemax={fields.length}
            aria-valuenow={index + 1}
            className="bg-neutral-soft h-2 overflow-hidden rounded-full"
          >
            <div
              className="bg-navy h-full transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${((index + 1) / fields.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-10 px-4 pt-8 pb-16 sm:px-10">
        <div className="flex max-w-[250px] flex-[1_1_220px] flex-col gap-1.5">
          <p className="text-muted-foreground text-[0.9375rem] font-bold">Kanwa innowacji</p>
          <Steps
            label="Części kanwy"
            currentId={sectionOf(field.id)?.id ?? ""}
            steps={sections.map((section) => ({
              id: section.id,
              label: section.label,
              href: stepHref(ideaId, section.fields[0].id),
              done: answeredCount(section.fields, idea.answers),
              total: section.fields.length,
            }))}
          />
          <Link href={cardHref} className="mt-3 font-bold">
            Podgląd fiszki
          </Link>
        </div>

        <section
          aria-label="Pytanie"
          className="flex max-w-[680px] min-w-0 flex-[999_1_480px] flex-col gap-6"
        >
          {/* key: a new question starts with fresh local state (partners list) */}
          <Question key={field.id} field={field} answer={idea.answers[field.id]} onChange={save} />

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
