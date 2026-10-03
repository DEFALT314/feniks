"use client";

import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { ApplicationResponse, type CallSummary, type IdeaDraft } from "@/lib/contracts/ai";
import { postJson } from "../_lib/api";

type Section = ApplicationResponse["sections"][number];
type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; sections: Section[] }
  | { status: "error"; message: string };

const date = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeZone: "Europe/Warsaw" });

// "Wniosek pod nabór" (#35): a draft grant application for an open call (P3: POST /api/ai/application).
// The draft is editable text the author copies; AI leaves numbers and costs as [placeholders].
export function ApplicationDraft({ calls, draft }: { calls: CallSummary[]; draft: IdeaDraft }) {
  const selectId = useId();
  const [callId, setCallId] = useState(calls[0]?.id ?? "");
  const [state, setState] = useState<State>({ status: "idle" });
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const call = calls.find((c) => c.id === callId);

  const generate = async () => {
    setState({ status: "loading" });
    setCopied(null);
    const result = await postJson(
      "/api/ai/application",
      { idea: draft, call_id: callId },
      ApplicationResponse,
    );
    if (!result.ok) return setState({ status: "error", message: result.error });
    setTexts(Object.fromEntries(result.data.sections.map((s) => [s.key, s.text])));
    setState({ status: "done", sections: result.data.sections });
  };

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      setCopied(null);
    }
  };

  const fullText =
    state.status === "done"
      ? state.sections.map((s) => `${s.title}\n${texts[s.key] ?? s.text}`).join("\n\n")
      : "";

  if (calls.length === 0) return null;
  return (
    <section
      aria-labelledby="application-heading"
      className="border-border flex flex-col gap-4 border-t pt-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="application-heading" className="text-[1.625rem] font-bold">
          Wniosek pod nabór
        </h2>
        <Badge variant="ai">Propozycja AI</Badge>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="font-bold">
          Nabór
        </label>
        <select
          id={selectId}
          value={callId}
          onChange={(e) => {
            setCallId(e.target.value);
            setState({ status: "idle" });
          }}
          className="border-input min-h-[50px] w-full rounded-[10px] border bg-white px-3 text-lg"
        >
          {calls.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {call ? (
          <p className="text-muted-foreground text-base">
            {call.organizer}
            {call.deadline ? ` · termin: ${date.format(new Date(call.deadline))}` : ""}
            {call.demo ? " · Dane demonstracyjne" : ""}
            <br />
            {call.goal}
          </p>
        ) : null}
      </div>
      <Button
        variant="secondary"
        className="self-start"
        onClick={generate}
        disabled={state.status === "loading" || !callId || draft.description === ""}
      >
        {state.status === "done" ? "Przygotuj szkic od nowa" : "Przygotuj szkic wniosku"}
      </Button>
      {draft.description === "" ? (
        <p className="text-muted-foreground text-base">Najpierw opisz pomysł w polu „Opis”.</p>
      ) : null}
      <div aria-live="polite" className="flex flex-col gap-4">
        {state.status === "loading" ? (
          <p role="status">Asystent AI pisze szkic wniosku. To trwa około 10–20 sekund.</p>
        ) : null}
        {state.status === "error" ? (
          <p role="alert" className="text-danger font-bold">
            {state.message}
          </p>
        ) : null}
        {state.status === "done" ? (
          <>
            <p className="text-muted-foreground text-base">
              To szkic do poprawienia. Fragmenty w nawiasach [ ] uzupełnij sam: AI nie podaje liczb
              ani kwot.
            </p>
            {state.sections.map((section) => (
              <div key={section.key} className="flex flex-col gap-2">
                <Field
                  label={section.title}
                  hint={
                    section.needs_user_input ? "Uzupełnij fragmenty w nawiasach [ ]." : undefined
                  }
                >
                  {(control) => (
                    <Textarea
                      {...control}
                      rows={4}
                      value={texts[section.key] ?? ""}
                      onChange={(e) => setTexts((t) => ({ ...t, [section.key]: e.target.value }))}
                      className={section.needs_user_input ? "border-warning" : undefined}
                    />
                  )}
                </Field>
                <Button
                  variant="tertiary"
                  size="sm"
                  className="self-start px-0"
                  onClick={() => copy(section.key, texts[section.key] ?? "")}
                >
                  {copied === section.key ? "Skopiowano" : `Kopiuj: ${section.title}`}
                </Button>
              </div>
            ))}
            <Button
              variant="secondary"
              className="self-start"
              onClick={() => copy("all", fullText)}
            >
              {copied === "all" ? "Skopiowano cały wniosek" : "Kopiuj cały wniosek"}
            </Button>
          </>
        ) : null}
      </div>
    </section>
  );
}
