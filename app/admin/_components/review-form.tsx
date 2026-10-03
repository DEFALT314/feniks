"use client";

import { useActionState, useEffect, useRef } from "react";
import { announce } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { focusElement, focusFirstError } from "@/components/ui/focus";
import { Textarea } from "@/components/ui/input";
import { submitReview } from "../_lib/actions";
import type { Expert } from "../_lib/queue";
import type { ReviewState } from "../_lib/review";

const initial: ReviewState = { status: "idle" };

// Decision buttons from design/makiety/Admin.dc.html: Zatwierdź / Do poprawy / Odrzuć,
// plus "Przekaż ekspertowi" (status "w weryfikacji").
export function ReviewForm({
  ideaId,
  experts,
  currentExpertId,
}: {
  ideaId: string;
  experts: Expert[];
  currentExpertId: string | null;
}) {
  const [state, action, pending] = useActionState(submitReview.bind(null, ideaId), initial);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const saved = state.status === "saved" ? savedMessage(state) : null;
  const error = state.status === "error" ? (state.message ?? state.fieldErrors?.status) : null;

  // After a decision the queue reloads and this idea can leave the list, taking the pressed
  // button with it (WCAG 2.4.3). Announce the result and, if focus fell to <body>, put it on
  // the result text. After an error go to the first invalid field or the message (3.3.1).
  useEffect(() => {
    if (state.status === "saved") {
      announce(savedMessage(state));
      if (!formRef.current?.contains(document.activeElement)) focusElement(statusRef.current);
    } else if (state.status === "error") {
      focusFirstError(formRef.current);
    }
  }, [state]);

  // The reloaded queue can also arrive a moment later and swap the form for the next idea.
  const lastSaved = state.status === "saved";
  useEffect(() => {
    const lost = !document.activeElement || document.activeElement === document.body;
    if (lastSaved && lost) focusElement(statusRef.current);
  }, [ideaId, lastSaved]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3" key={ideaId}>
      <Field
        label="Odpowiedź dla autora"
        hint="Autor zobaczy ją w aplikacji i dostanie mailem. Wymagana przy „Do poprawy” i „Odrzuć”."
        error={state.fieldErrors?.komentarz}
      >
        {(p) => <Textarea {...p} name="komentarz" rows={3} className="text-base" />}
      </Field>
      <Field label="Ekspert" error={state.fieldErrors?.ekspert_id}>
        {(p) => (
          <select
            {...p}
            name="ekspert_id"
            defaultValue={currentExpertId ?? ""}
            className="border-input text-ink focus:border-navy min-h-11 w-full rounded-[10px] border bg-white px-3 text-base"
          >
            <option value="">bez eksperta</option>
            {experts.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nazwa}
              </option>
            ))}
          </select>
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="status" value="zatwierdzony" disabled={pending}>
          Zatwierdź
        </Button>
        <Button
          type="submit"
          name="status"
          value="do_poprawy"
          variant="secondary"
          disabled={pending}
        >
          Do poprawy
        </Button>
        <Button
          type="submit"
          name="status"
          value="odrzucony"
          variant="destructive"
          disabled={pending}
        >
          Odrzuć
        </Button>
        <Button
          type="submit"
          name="status"
          value="w_weryfikacji"
          variant="tertiary"
          disabled={pending}
        >
          Przekaż ekspertowi
        </Button>
      </div>
      {/* Not a live region: success goes through announce(), errors get focus */}
      <p
        ref={statusRef}
        tabIndex={-1}
        data-form-error={!pending && error ? "" : undefined}
        className="text-base"
      >
        {pending ? "Zapisujemy…" : null}
        {!pending && saved ? <strong className="text-success">{saved}</strong> : null}
        {!pending && error ? <strong className="text-danger">{error}</strong> : null}
      </p>
    </form>
  );
}

function savedMessage(state: ReviewState): string {
  const channel = state.emailSent ? " i maila." : " w aplikacji.";
  return `${state.message ?? ""} Autor dostał powiadomienie${channel}`.trim();
}
