"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
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

  return (
    <form action={action} className="flex flex-col gap-3" key={ideaId}>
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
      <p role="status" aria-live="polite" className="text-base">
        {pending ? "Zapisujemy…" : null}
        {!pending && state.status === "saved" ? (
          <strong className="text-success">
            {state.message} Autor dostał powiadomienie
            {state.emailSent ? " i maila." : " w aplikacji."}
          </strong>
        ) : null}
        {!pending && state.status === "error" && state.message ? (
          <strong className="text-danger">{state.message}</strong>
        ) : null}
      </p>
    </form>
  );
}
