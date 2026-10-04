"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { focusElement, useFocusFirstError } from "@/components/ui/focus";
import type { IdeaStatus } from "@/lib/contracts/admin";
import { sendToRops } from "../actions";
import { PublicationConsent } from "./publication-consent";
import { authorStatus, canSubmit } from "../_lib/submission";
import type { SubmitState } from "../_lib/submit";

const dateTime = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

type Props = {
  ideaId: string;
  sentAt: string | null;
  status: IdeaStatus | null;
  comment: string | null;
  missing: string[]; // empty required card fields, from the current (unsaved) draft
  beforeSend: () => Promise<boolean>; // saves pending card edits first
  justSent: "first" | "again" | null; // after a successful send the page reloads with ?sent=
  consent: boolean; // the author agreed to show the idea as a good practice (#104)
  publishedAt: string | null; // ROPS shows it in the Library since then
};

// "Wyślij do ROPS" (#35): sendToRops sends the idea, notifies ROPS and reloads the card with ?sent=
export function SubmitPanel({
  ideaId,
  sentAt,
  status,
  comment,
  missing,
  beforeSend,
  justSent,
  consent,
  publishedAt,
}: Props) {
  const [state, send, pending] = useActionState<SubmitState, FormData>(
    async (_previous, form) => {
      if (!(await beforeSend())) {
        return {
          status: "error",
          message:
            "Nie wysłaliśmy pomysłu, bo nie udało się zapisać fiszki. Popraw zaznaczone pola i wyślij jeszcze raz.",
        };
      }
      return sendToRops(ideaId, form.get("zgoda") === "on");
    },
    { status: "idle" },
  );

  const sentRef = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const missingId = useId();
  const consentHintId = useId();
  // A failed send: focus the error, so it is read and the user knows the send didn't happen
  useFocusFirstError(formRef, state.status === "error" ? state : undefined);

  // Show the confirmation once: drop ?sent= so a reload or Back doesn't repeat it. The page has
  // just reloaded, so a live region would stay silent: focus the confirmation instead (WCAG 4.1.3).
  useEffect(() => {
    if (!justSent) return;
    focusElement(sentRef.current);
    const url = new URL(window.location.href);
    url.searchParams.delete("sent");
    window.history.replaceState(window.history.state, "", url);
  }, [justSent]);

  const label = authorStatus(sentAt, status);
  const allowed = canSubmit(sentAt, status) && state.status !== "sent";
  const resend = sentAt !== null;

  return (
    <section aria-labelledby="submit-heading" className="flex flex-col gap-3">
      <h2 id="submit-heading" className="sr-only">
        Wysyłka do ROPS
      </h2>
      {sentAt ? (
        <div className="flex flex-col gap-2">
          <Badge variant={label.badge} className="self-start">
            {label.label}
          </Badge>
          <p className="text-muted-foreground text-base">
            Wysłano {dateTime.format(new Date(sentAt))}.
          </p>
          {comment ? (
            <p className="bg-neutral-soft rounded-[10px] px-4 py-3 text-base">
              <strong>Uwagi ROPS:</strong> {comment}
            </p>
          ) : null}
          {/* Opens the idea's conversation (or a new message about it): answer ROPS or ask */}
          <Link href={`/my/messages?idea=${ideaId}`} className="self-start text-base">
            {comment ? "Odpowiedz ROPS w Wiadomościach" : "Napisz do ROPS o tym pomyśle"}
          </Link>
        </div>
      ) : null}
      {allowed ? (
        <form action={send} className="flex flex-col gap-2">
          {missing.length ? (
            <p id={missingId} className="text-base">
              Żeby wysłać, uzupełnij: <strong>{missing.join(", ")}</strong>.
            </p>
          ) : null}
          <div className="flex flex-col gap-1.5 pb-1">
            <label className="flex min-h-11 cursor-pointer items-start gap-3 text-base font-bold">
              <input
                type="checkbox"
                name="zgoda"
                defaultChecked={consent}
                aria-describedby={consentHintId}
                className="accent-navy mt-0.5 size-5 shrink-0"
              />
              Zgadzam się, żeby ROPS pokazał mój pomysł innym, bez mojego imienia i nazwiska.
            </label>
            <p id={consentHintId} className="text-muted-foreground pl-8 text-base">
              Po zatwierdzeniu ROPS może pokazać fiszkę w Bibliotece jako dobrą praktykę: tytuł,
              opis, istotę, dla kogo i etap. Nie wpisuj w niej danych osobowych. Zgodę możesz
              wycofać w każdej chwili.
            </p>
          </div>
          <Button
            type="submit"
            disabled={pending || missing.length > 0}
            aria-describedby={missing.length ? missingId : undefined}
          >
            {pending ? "Wysyłamy…" : resend ? "Wyślij poprawioną wersję" : "Wyślij do ROPS"}
          </Button>
          <p className="text-muted-foreground text-base">
            ROPS dostanie powiadomienie. Odpowiedź zobaczysz w Wiadomościach, wyślemy ją też mailem.
          </p>
        </form>
      ) : null}
      {sentAt && !allowed ? (
        <PublicationConsent
          ideaId={ideaId}
          consent={consent}
          publishedAt={publishedAt}
          approved={status === "zatwierdzony"}
        />
      ) : null}
      <div ref={formRef}>
        {justSent && sentAt ? (
          <p ref={sentRef} tabIndex={-1} className="text-success font-bold">
            {justSent === "again" ? "Wysłano poprawioną wersję do ROPS." : "Wysłano do ROPS."}{" "}
            Dostaniesz powiadomienie, gdy zespół oceni pomysł.
          </p>
        ) : null}
        {state.status === "error" ? (
          <p data-form-error className="text-danger font-bold">
            {state.message}
            {state.missing?.length ? ` Brakuje: ${state.missing.join(", ")}.` : ""}
          </p>
        ) : null}
      </div>
    </section>
  );
}
