import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { answeredCount, fields, STAGE_LABELS } from "../_lib/canvas";
import type { MyIdea } from "../_lib/ideas";
import { authorStatus } from "../_lib/submission";
import { NewIdeaForm } from "./new-idea-form";

const dateTime = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

// "Moje pomysły": the author's ideas with their ROPS status, and starting a new one
export function MyIdeas({ ideas }: { ideas: MyIdea[] }) {
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
          Twoje pomysły
        </h2>
        {ideas.length === 0 ? (
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
      </section>
    </main>
  );
}

function IdeaSummary({ idea }: { idea: MyIdea }) {
  const done = answeredCount(fields, idea.answers);
  const status = authorStatus(idea.wyslany_at, idea.status);
  return (
    <Card className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-[1.375rem] leading-snug font-bold">{idea.tytul}</h3>
        <Badge variant={status.badge}>{status.label}</Badge>
      </div>
      <p className="text-muted-foreground text-base tabular-nums">
        Kanwa: {done} z {fields.length} pytań
        {idea.etap ? ` · etap: ${STAGE_LABELS[idea.etap]}` : ""} · zmieniono{" "}
        {dateTime.format(new Date(idea.updated_at))}
      </p>
      {idea.komentarz ? (
        <p className="bg-neutral-soft rounded-[10px] px-4 py-3 text-base">
          <strong>Uwagi ROPS:</strong> {idea.komentarz}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap gap-3 pt-1">
        <Link
          href={`/my/creator/${idea.id}?step=${firstUnanswered(idea)}`}
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          {done === fields.length ? "Przejrzyj kanwę" : "Dokończ kanwę"}
          <span className="sr-only">: {idea.tytul}</span>
        </Link>
        <Link
          href={`/my/creator/${idea.id}/card`}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          Fiszka<span className="sr-only">: {idea.tytul}</span>
        </Link>
      </div>
    </Card>
  );
}

function firstUnanswered(idea: MyIdea): string {
  return (fields.find((field) => !idea.answers[field.id]) ?? fields[0]).id;
}
