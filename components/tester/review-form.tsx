"use client";

import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import type { MyReview, ReviewState } from "@/lib/innovation-feedback";
import { saveReviewAction } from "@/lib/innovation-feedback-actions";

// "Oceń to rozwiązanie": 1–5, what works, an improvement proposal (goes to ROPS).
export function ReviewForm({
  innovationId,
  mine,
}: {
  innovationId: string;
  mine: MyReview | null;
}) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(
    saveReviewAction.bind(null, innovationId),
    { status: "idle" },
  );
  const legendId = useId();
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-3">
      <fieldset
        aria-describedby={e.ocena ? `${legendId}-error` : undefined}
        className="flex flex-col gap-1.5"
      >
        <legend id={legendId} className="font-bold">
          Twoja ocena
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="border-input has-[:checked]:border-navy has-[:checked]:bg-navy has-[:focus-visible]:outline-brick flex size-11 cursor-pointer items-center justify-center rounded-[10px] border bg-white font-bold has-[:checked]:text-white has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2"
            >
              <input
                type="radio"
                name="ocena"
                value={n}
                defaultChecked={mine?.ocena === n}
                className="sr-only"
              />
              {n}
              <span className="sr-only"> na 5</span>
            </label>
          ))}
        </div>
        {e.ocena ? (
          <p id={`${legendId}-error`} className="text-danger text-base font-bold">
            {e.ocena}
          </p>
        ) : null}
      </fieldset>
      <Field label="Co działa dobrze?" error={e.co_dzialalo}>
        {(p) => (
          <Textarea
            {...p}
            name="co_dzialalo"
            rows={2}
            maxLength={2000}
            defaultValue={mine?.co_dzialalo ?? ""}
          />
        )}
      </Field>
      <Field
        label="Co można usprawnić?"
        hint="Konkretna propozycja trafi do ROPS."
        error={e.co_poprawic}
      >
        {(p) => (
          <Textarea
            {...p}
            name="co_poprawic"
            rows={2}
            maxLength={2000}
            defaultValue={mine?.co_poprawic ?? ""}
          />
        )}
      </Field>
      <Button type="submit" variant="secondary" className="self-start" disabled={pending}>
        {pending ? "Zapisujemy…" : mine ? "Zmień opinię" : "Wyślij opinię"}
      </Button>
      <p role="status" aria-live="polite" className="text-base">
        {state.status === "saved" ? (
          <strong className="text-success">{state.message}</strong>
        ) : null}
        {state.status === "error" && state.message ? (
          <strong className="text-danger">{state.message}</strong>
        ) : null}
      </p>
    </form>
  );
}
