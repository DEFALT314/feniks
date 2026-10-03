"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { IdeaWithCanvas } from "@/lib/contracts/idea-creator";
import { answeredCount, fields, STAGE_LABELS } from "../_lib/canvas";
import { ideaStore, useIdeas } from "../_lib/use-ideas";

// "Moje pomysły": the author's ideas with their status, and starting a new one
export function MyIdeas() {
  const ideas = useIdeas();
  return (
    <main id="main-content" className="flex-1">
      <div className="border-border border-b bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 pt-10 pb-8 sm:px-10">
          <h1 className="text-[2.75rem] leading-tight font-bold">Moje pomysły</h1>
          <p className="text-muted-foreground max-w-[760px]">
            Kreator prowadzi przez kanwę innowacji: jedno pytanie na ekranie. Na końcu powstaje
            fiszka, którą możesz wysłać do ROPS.
          </p>
          <NewIdeaForm />
        </div>
      </div>
      <section
        aria-labelledby="ideas-heading"
        className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-8 pb-16 sm:px-10"
      >
        <h2 id="ideas-heading" className="text-[1.625rem] font-bold">
          Twoje szkice
        </h2>
        {ideas === null ? (
          <p aria-busy="true">Wczytywanie…</p>
        ) : ideas.length === 0 ? (
          <p className="text-muted-foreground">
            Nie masz jeszcze pomysłów. Nazwij pierwszy powyżej.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {ideas.map((idea) => (
              <li key={idea.id}>
                <IdeaSummary idea={idea} />
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground text-base">
          Szkice zapisują się w tej przeglądarce. Po zalogowaniu będą też na Twoim koncie.
        </p>
      </section>
    </main>
  );
}

function NewIdeaForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();

  const start = (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() === "") {
      setError("Wpisz roboczy tytuł, np. „Sąsiedzki dyżur po wypisie”.");
      return;
    }
    const idea = ideaStore().create(title);
    router.push(`/my/creator/${idea.id}?step=${fields[0].id}`);
  };

  return (
    <form onSubmit={start} noValidate className="mt-2 flex max-w-[760px] flex-wrap items-end gap-3">
      <Field label="Nowy pomysł" error={error} className="min-w-0 flex-[1_1_320px]">
        {(control) => (
          <Input
            {...control}
            maxLength={200}
            value={title}
            placeholder="np. Sąsiedzki dyżur po wypisie"
            onChange={(e) => {
              setTitle(e.target.value);
              setError(undefined);
            }}
          />
        )}
      </Field>
      <Button type="submit">Zacznij kanwę</Button>
    </form>
  );
}

function IdeaSummary({ idea }: { idea: IdeaWithCanvas }) {
  const done = answeredCount(fields, idea.answers);
  const updated = new Date(idea.updated_at).toLocaleString("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <Card className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-[1.375rem] leading-snug font-bold">{idea.tytul}</h3>
        {idea.wyslany_at ? (
          <Badge variant="ai">Wysłany do ROPS</Badge>
        ) : (
          <Badge variant="neutral">Szkic</Badge>
        )}
      </div>
      <p className="text-muted-foreground text-base">
        Kanwa: {done} z {fields.length} pytań
        {idea.etap ? ` · etap: ${STAGE_LABELS[idea.etap]}` : ""} · zmieniono {updated}
      </p>
      <div className="mt-auto flex flex-wrap gap-3 pt-1">
        <Link
          href={`/my/creator/${idea.id}?step=${firstUnanswered(idea)}`}
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          {done === fields.length ? "Przejrzyj kanwę" : "Dokończ kanwę"}
        </Link>
        <Link
          href={`/my/creator/${idea.id}/card`}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          Fiszka
        </Link>
      </div>
    </Card>
  );
}

function firstUnanswered(idea: IdeaWithCanvas): string {
  return (fields.find((field) => !idea.answers[field.id]) ?? fields[0]).id;
}
