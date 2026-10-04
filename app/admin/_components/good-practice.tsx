"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { announce } from "@/components/ui/announcer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { focusElement } from "@/components/ui/focus";
import { setIdeaGoodPractice } from "../_lib/actions";
import type { PublishState } from "../_lib/publication";

const day = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});

type Props = {
  ideaId: string;
  approved: boolean; // the current ROPS decision is "zatwierdzony"
  consent: boolean; // the author agreed to show the card
  publishedAt: string | null;
};

// "Dobra praktyka" in the idea details (#104). ROPS sees the author's consent while reviewing, and
// after approval shows or hides the idea in the Library. One button that changes its label keeps
// focus in place; the result is announced, a refusal gets focus.
export function GoodPracticeBox({ ideaId, approved, consent, publishedAt }: Props) {
  // A stale date without a current approval is not shown publicly (dobre_praktyki() checks both)
  const shown = consent && approved && publishedAt !== null;
  const [state, toggle, pending] = useActionState<PublishState>(
    () => setIdeaGoodPractice(ideaId, !shown),
    { status: "idle" },
  );
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status === "saved") announce(state.message);
    if (state.status === "error") focusElement(errorRef.current);
  }, [state]);

  return (
    <section
      aria-labelledby={`good-practice-${ideaId}`}
      className="border-border flex flex-col gap-2 border-t pt-3"
    >
      <h3 id={`good-practice-${ideaId}`} className="text-base font-bold">
        Dobra praktyka
      </h3>
      {!consent ? (
        <p className="text-muted-foreground text-base">
          Osoba, która zgłosiła pomysł, nie zgodziła się na pokazanie go innym.
        </p>
      ) : shown ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Badge variant="success">W Bibliotece od {day.format(new Date(publishedAt))}</Badge>
          <Link href={`/library/good-practices/${ideaId}`} className="text-base">
            Zobacz w Bibliotece
          </Link>
        </div>
      ) : (
        <p className="text-base">
          Osoba, która zgłosiła pomysł, zgodziła się na pokazanie fiszki innym, bez imienia i
          nazwiska.
          {approved ? null : " Po zatwierdzeniu możesz pokazać go w Bibliotece."}
        </p>
      )}
      {consent && (approved || shown) ? (
        <form action={toggle}>
          <Button type="submit" variant="secondary" size="sm" disabled={pending}>
            {shown ? "Przestań pokazywać" : "Pokaż jako dobrą praktykę"}
          </Button>
        </form>
      ) : null}
      {state.status === "error" ? (
        <p ref={errorRef} tabIndex={-1} data-form-error className="text-danger text-base font-bold">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
