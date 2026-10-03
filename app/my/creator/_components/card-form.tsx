"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChoiceTile } from "@/components/ui/choice-tile";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { IdeaStage } from "@/lib/contracts/ai";
import type { IdeaCardInput, IdeaWithCanvas } from "@/lib/contracts/idea-creator";
import { cardHints, STAGE_LABELS } from "../_lib/canvas";
import { ideaStore, useIdea } from "../_lib/use-ideas";
import { IdeaNotFound, Loading } from "./states";

// The idea card ("fiszka", design/makiety/Fiszka.dc.html). AI hints and sending to ROPS come in #35.
export function IdeaCard({ ideaId }: { ideaId: string }) {
  const idea = useIdea(ideaId);
  if (idea === null) return <Loading />;
  if (idea === undefined) return <IdeaNotFound />;
  return <CardForm key={idea.id} idea={idea} />;
}

type Draft = { tytul: string; opis: string; istota: string; dla_kogo: string };

function CardForm({ idea }: { idea: IdeaWithCanvas }) {
  // Local text state: the title may be empty while typing, the store only takes valid cards
  const [draft, setDraft] = useState<Draft>({
    tytul: idea.tytul,
    opis: idea.opis ?? "",
    istota: idea.istota ?? "",
    dla_kogo: idea.dla_kogo ?? "",
  });
  const hints = cardHints(idea.answers);
  const titleError = draft.tytul.trim() === "" ? "Wpisz tytuł pomysłu." : undefined;

  const save = (input: IdeaCardInput) => ideaStore().saveCard(idea.id, input);
  const changeText = (key: keyof Draft, value: string) => {
    setDraft({ ...draft, [key]: value });
    if (key === "tytul") {
      if (value.trim() !== "") save({ tytul: value.trim() });
    } else {
      save({ [key]: value.trim() === "" ? null : value });
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
          <p className="text-muted-foreground text-base">Szkic · zapisuje się automatycznie</p>
        </div>
      </div>

      <section
        aria-label="Fiszka"
        className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pt-8 pb-16 sm:px-10"
      >
        <div className="flex max-w-[700px] flex-col gap-5">
          <h2 className="text-[1.625rem] font-bold">Fiszka</h2>
          <Field label="Tytuł" error={titleError}>
            {(control) => (
              <Input
                {...control}
                maxLength={200}
                value={draft.tytul}
                onChange={(e) => changeText("tytul", e.target.value)}
              />
            )}
          </Field>
          <TextField
            label="Opis"
            hint="Jaki problem rozwiązujecie i jak?"
            rows={4}
            max={3000}
            value={draft.opis}
            onChange={(v) => changeText("opis", v)}
            fromCanvas={hints.opis}
          />
          <TextField
            label="Istota"
            hint="Jedno zdanie: co zmienia się dla ludzi."
            rows={2}
            max={500}
            value={draft.istota}
            onChange={(v) => changeText("istota", v)}
            fromCanvas={hints.istota}
          />
          <TextField
            label="Dla kogo"
            rows={2}
            max={500}
            value={draft.dla_kogo}
            onChange={(v) => changeText("dla_kogo", v)}
            fromCanvas={hints.dla_kogo}
          />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 font-bold">Etap</legend>
            <div className="grid gap-2 sm:grid-cols-4">
              {IdeaStage.options.map((stage) => (
                <ChoiceTile
                  key={stage}
                  size="compact"
                  name="etap"
                  value={stage}
                  title={STAGE_LABELS[stage]}
                  checked={idea.etap === stage}
                  onChange={() => save({ etap: stage })}
                />
              ))}
            </div>
          </fieldset>
        </div>
      </section>
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
