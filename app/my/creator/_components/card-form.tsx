"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChoiceTile } from "@/components/ui/choice-tile";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { IdeaStage, type CallSummary } from "@/lib/contracts/ai";
import type { IdeaCardInput } from "@/lib/contracts/idea-creator";
import { saveIdeaCard } from "../actions";
import { cardHints, STAGE_LABELS } from "../_lib/canvas";
import type { MyIdea } from "../_lib/ideas";
import {
  authorStatus,
  matchDescription,
  missingForSubmission,
  toIdeaDraft,
} from "../_lib/submission";
import { saveStatusText, useAutosave } from "../_lib/use-autosave";
import { AiHints, type CardField } from "./ai-hints";
import { ApplicationDraft } from "./application-draft";
import { SimilarInnovation } from "./similar-innovation";
import { SubmitPanel } from "./submit-panel";

// Longest text each card field accepts (lib/contracts/idea-creator.ts, Idea)
const MAX: Record<CardField, number> = { tytul: 200, opis: 3000, istota: 500, dla_kogo: 500 };

type Draft = Record<CardField, string>;

// The idea card ("fiszka", design/makiety/Fiszka.dc.html): fields saved as you type, AI hints,
// a grant application draft, a similar innovation from the ROPS Library and sending to ROPS.
export function IdeaCard({ idea, calls }: { idea: MyIdea; calls: CallSummary[] }) {
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
    <main id="main-content" className="flex-1">
      <div className="border-border border-b bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2.5 px-4 pt-8 pb-7 sm:px-10">
          <Link href={`/my/creator/${idea.id}`} className="text-base">
            ← Wróć do kreatora
          </Link>
          <h1 className="text-[2.5rem] leading-tight font-bold">{draft.tytul || idea.tytul}</h1>
          <p className="text-muted-foreground text-base">
            {status.label} ·{" "}
            <span
              role="status"
              className={autosave.status === "error" ? "text-danger font-bold" : undefined}
            >
              {saveStatusText(autosave.status, autosave.error)}
            </span>
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-12 px-4 pt-8 pb-16 sm:px-10">
        <section
          aria-label="Fiszka"
          className="flex max-w-[700px] min-w-0 flex-[999_1_520px] flex-col gap-5"
        >
          <h2 className="text-[1.625rem] font-bold">Fiszka</h2>
          <Field label="Tytuł" error={titleError}>
            {(control) => (
              <Input
                {...control}
                maxLength={MAX.tytul}
                value={draft.tytul}
                onChange={(e) => change("tytul", e.target.value)}
              />
            )}
          </Field>
          <TextField
            label="Opis"
            hint="Jaki problem rozwiązujecie i jak?"
            rows={4}
            max={MAX.opis}
            value={draft.opis}
            onChange={(v) => change("opis", v)}
            fromCanvas={hints.opis}
          />
          <TextField
            label="Istota"
            hint="Jedno zdanie: co zmienia się dla ludzi."
            rows={2}
            max={MAX.istota}
            value={draft.istota}
            onChange={(v) => change("istota", v)}
            fromCanvas={hints.istota}
          />
          <TextField
            label="Dla kogo"
            rows={2}
            max={MAX.dla_kogo}
            value={draft.dla_kogo}
            onChange={(v) => change("dla_kogo", v)}
            fromCanvas={hints.dla_kogo}
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

          <AiHints draft={toIdeaDraft(card)} onUse={(field, text) => change(field, text, 0)} />
          <ApplicationDraft calls={calls} draft={toIdeaDraft(card)} />
        </section>

        <aside className="flex max-w-[380px] flex-[1_1_320px] flex-col gap-5">
          <SimilarInnovation description={matchDescription(card)} />
          <SubmitPanel
            ideaId={idea.id}
            sentAt={idea.wyslany_at}
            status={idea.status}
            comment={idea.komentarz}
            missing={missingForSubmission(card)}
            beforeSend={autosave.flush}
          />
        </aside>
      </div>
    </main>
  );
}

type TextFieldProps = {
  label: string;
  hint?: ReactNode;
  rows: number;
  max: number;
  value: string;
  onChange: (value: string) => void;
  fromCanvas: string[];
};

function TextField({ label, hint, rows, max, value, onChange, fromCanvas }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Field label={label} hint={hint}>
        {(control) => (
          <Textarea
            {...control}
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
      <p className="font-bold">Z Twojej kanwy – może pomóc napisać pole „{label}”:</p>
      <ul className="list-disc pl-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
