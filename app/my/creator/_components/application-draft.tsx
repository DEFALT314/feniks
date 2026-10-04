"use client";

import { useId, useState } from "react";
import { announce } from "@/components/ui/announcer";
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
  | { status: "done"; sections: Section[]; callId: string }
  | { status: "error"; message: string };

const date = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeZone: "Europe/Warsaw" });

// "Wniosek pod nabór" (#35): a draft grant application for an open call (P3: POST /api/ai/application).
// The draft is editable text the author copies; AI leaves numbers and costs as [placeholders].
// Accessibility: the draft is announced as one short sentence, not read out whole (WCAG 4.1.3);
// changing the call keeps the edited draft until the author asks for a new one.
export function ApplicationDraft({ calls, draft }: { calls: CallSummary[]; draft: IdeaDraft }) {
  const selectId = useId();
  const reasonId = useId();
  const [callId, setCallId] = useState(calls[0]?.id ?? "");
  const [state, setState] = useState<State>({ status: "idle" });
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const call = calls.find((c) => c.id === callId);

  const generate = async () => {
    setState({ status: "loading" });
    setCopied(null);
    announce("Asystent AI pisze szkic wniosku.");
    const result = await postJson(
      "/api/ai/application",
      { idea: draft, call_id: callId },
      ApplicationResponse,
    );
    if (!result.ok) {
      announce(result.error);
      return setState({ status: "error", message: result.error });
    }
    setTexts(Object.fromEntries(result.data.sections.map((s) => [s.key, s.text])));
    setState({ status: "done", sections: result.data.sections, callId });
    announce(applicationAnnouncement(result.data.sections.length));
  };

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      announce("Skopiowano do schowka.");
    } catch {
      setCopied(null);
    }
  };

  const fullText =
    state.status === "done"
      ? state.sections.map((s) => `${s.title}\n${texts[s.key] ?? s.text}`).join("\n\n")
      : "";

  const noDescription = draft.description === "";
  const draftCall =
    state.status === "done" && state.callId !== callId
      ? calls.find((c) => c.id === state.callId)
      : undefined;

  if (calls.length === 0) {
    return (
      <section
        aria-labelledby="application-heading"
        className="border-border flex flex-col gap-2 border-t pt-6"
      >
        <h2 id="application-heading" className="text-[1.625rem] font-bold">
          Wniosek pod nabór
        </h2>
        <p className="text-base">
          Teraz nie ma otwartych naborów. Gdy ROPS ogłosi nabór, tutaj przygotujesz szkic wniosku
          dopasowany do jego celu.
        </p>
      </section>
    );
  }
  return (
    <section
      aria-labelledby="application-heading"
      className="border-border flex flex-col gap-4 border-t pt-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="application-heading" className="text-[1.625rem] font-bold">
          Szkic wniosku o dofinansowanie
        </h2>
        <Badge variant="ai">Propozycja AI</Badge>
      </div>
      <p className="text-base">
        Asystent AI ułoży szkic wniosku z Twojej fiszki, dopasowany do celu wybranego naboru.
      </p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="font-bold">
          Nabór
        </label>
        <select
          id={selectId}
          value={callId}
          onChange={(e) => setCallId(e.target.value)}
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
        disabled={state.status === "loading" || !callId || noDescription}
        aria-describedby={noDescription ? reasonId : undefined}
      >
        {state.status === "done" ? "Przygotuj szkic od nowa" : "Przygotuj szkic wniosku"}
      </Button>
      {noDescription ? (
        <p id={reasonId} className="text-base font-bold">
          Najpierw opisz pomysł w polu „Opis”.
        </p>
      ) : null}
      <div className="flex flex-col gap-4">
        {state.status === "loading" ? (
          <p>Asystent AI pisze szkic wniosku. To trwa około 10–20 sekund.</p>
        ) : null}
        {state.status === "error" ? (
          <div className="flex flex-col gap-1 text-base">
            <p className="text-danger font-bold">{state.message}</p>
            <p>
              Wniosek możesz też napisać sam: opis, istota i odbiorcy z fiszki to dobry początek.
              Wysłanie fiszki do ROPS działa bez asystenta.
            </p>
          </div>
        ) : null}
        {state.status === "done" ? (
          <>
            {draftCall ? (
              <p className="bg-warning-soft rounded-[10px] px-4 py-3 text-base">
                Ten szkic dotyczy naboru „{draftCall.name}”, a wybrany jest inny nabór. Kliknij
                „Przygotuj szkic od nowa”, żeby dopasować szkic do wybranego naboru. Twoje poprawki
                w szkicu wtedy znikną.
              </p>
            ) : null}
            <p className="text-muted-foreground text-base">
              To szkic do poprawienia. AI nie wpisuje liczb ani kwot. Uzupełnij je w miejscach w
              nawiasach [ ].
            </p>
            {state.sections.map((section) => (
              <div key={section.key} className="flex flex-col gap-2">
                <Field
                  label={section.title}
                  // Rule 5: every AI text says so, also when Tabbing from field to field
                  hint={
                    <>
                      <Badge variant="ai" className="mr-2">
                        Propozycja AI
                      </Badge>
                      {section.needs_user_input
                        ? "Uzupełnij fragmenty w nawiasach [ ]."
                        : "Sprawdź i popraw przed wysłaniem."}
                    </>
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

/** One sentence for the screen reader instead of the whole draft. */
export function applicationAnnouncement(sections: number): string {
  const parts = sections === 1 ? "1 część" : `${sections} części`;
  return `Gotowe: szkic wniosku ma ${parts}. Propozycja AI do sprawdzenia.`;
}
