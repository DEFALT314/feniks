"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { summarizeAction, type SummaryState } from "../actions";

export function SummaryButton({
  target,
}: {
  target: { kind: "test" | "innovation"; id: string; subject: string };
}) {
  const [state, action, pending] = useActionState<SummaryState>(
    summarizeAction.bind(null, target),
    { status: "idle" },
  );
  return (
    <div className="flex flex-col gap-3">
      <form action={action}>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Podsumowujemy…" : "Podsumuj opinie"}
        </Button>
      </form>
      <div aria-live="polite">
        {state.status === "done" && state.summary ? (
          <div className="bg-navy-soft/40 flex flex-col gap-2 rounded-[10px] p-4 text-base">
            <Badge variant="ai" className="self-start">
              Propozycja AI
            </Badge>
            <p>
              <strong>Co działa:</strong> {state.summary.co_dziala}
            </p>
            <p>
              <strong>Co poprawić:</strong> {state.summary.co_poprawic}
            </p>
            <p>
              <strong>Następny krok:</strong> {state.summary.nastepny_krok}
            </p>
          </div>
        ) : null}
        {state.status === "error" ? <p className="text-danger font-bold">{state.message}</p> : null}
      </div>
    </div>
  );
}
