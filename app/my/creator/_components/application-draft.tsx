"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { announce } from "@/components/ui/announcer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { ApplicationResponse, type CallSummary, type IdeaDraft } from "@/lib/contracts/ai";
import type { CallFit, IdeaArea } from "@/lib/ai/creator/call-fit";
import { postJson } from "../_lib/api";

type Section = ApplicationResponse["sections"][number];
type State =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "done";
      sections: Section[];
      callId: string;
      fit?: ApplicationResponse["fit"];
      missing?: string[];
    }
  | { status: "error"; message: string };

const date = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeZone: "Europe/Warsaw" });

// "Wniosek pod nabór" (#35): a draft grant application for an open call (P3: POST /api/ai/application).
// The draft is editable text the author copies; AI leaves numbers and costs as [placeholders].
// Accessibility: the draft is announced as one short sentence, not read out whole (WCAG 4.1.3);
// changing the call keeps the edited draft until the author asks for a new one.
const FIT: Record<
  NonNullable<ApplicationResponse["fit"]>["level"],
  { variant: "success" | "warning" | "danger"; text: string }
> = {
  dobra: { variant: "success", text: "Pasuje do naboru" },
  czesciowa: { variant: "warning", text: "Pasuje częściowo" },
  slaba: { variant: "danger", text: "Słabo pasuje do naboru" },
};

const CALL_FIT_NOTE: Record<CallFit, { variant: "success" | "neutral" | "warning"; text: string }> =
  {
    pasuje: { variant: "success", text: "Pasuje do obszaru Twojego pomysłu" },
    dowolny: { variant: "neutral", text: "Nabór dla każdego obszaru" },
    inny: { variant: "warning", text: "Ten nabór dotyczy innego obszaru" },
  };

export function ApplicationDraft({
  calls,
  draft,
  ideaId,
  areas = [],
}: {
  // ranked by lib/ai/creator/call-fit.ts on the card page: fitting calls first (P3)
  calls: (CallSummary & { fit?: CallFit })[];
  draft: IdeaDraft;
  ideaId?: string; // the saved idea: the draft then uses its canvas answers (P3)
  areas?: IdeaArea[]; // Challenges Map areas of the idea, if the search found them
}) {
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
      { idea: draft, call_id: callId, ...(ideaId ? { idea_id: ideaId } : {}) },
      ApplicationResponse,
    );
    if (!result.ok) {
      announce(result.error);
      return setState({ status: "error", message: result.error });
    }
    setTexts(Object.fromEntries(result.data.sections.map((s) => [s.key, s.text])));
    setState({
      status: "done",
      sections: result.data.sections,
      callId,
      fit: result.data.fit,
      missing: result.data.missing,
    });
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
      <section aria-labelledby="application-heading" className="flex flex-col gap-2">
        <h3 id="application-heading" className="text-xl font-bold">
          Wniosek pod nabór
        </h3>
        <p className="text-base">
          Teraz nie ma otwartych naborów. Gdy ROPS ogłosi nabór, tutaj przygotujesz szkic wniosku
          dopasowany do jego celu.
        </p>
      </section>
    );
  }
  return (
    <section aria-labelledby="application-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 id="application-heading" className="text-xl font-bold">
          Szkic wniosku o dofinansowanie
        </h3>
        <Badge variant="ai">Propozycja AI</Badge>
      </div>
      {areas.length ? (
        <p className="text-base">
          Twój pomysł dotyczy obszaru: <strong>{areas.map((a) => a.name).join(", ")}</strong>.
          Nabory dla tego obszaru są na górze listy.
        </p>
      ) : null}
      {areas.length && !calls.some((c) => c.fit === "pasuje") ? (
        <p className="bg-warning-soft rounded-[10px] px-4 py-3 text-base">
          Teraz nie ma naboru dla obszaru Twojego pomysłu. Możesz przygotować szkic pod nabór ogólny
          albo{" "}
          <Link
            href={`/my/messages/new?${new URLSearchParams({ topic: `Nabór dla pomysłu: ${draft.title}`.slice(0, 200) })}`}
          >
            zapytać ROPS o pieniądze na ten pomysł
          </Link>
          .
        </p>
      ) : null}
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
              {c.fit === "pasuje" ? " (pasuje do Twojego pomysłu)" : ""}
            </option>
          ))}
        </select>
        {call?.fit && areas.length ? (
          <Badge variant={CALL_FIT_NOTE[call.fit].variant} className="self-start">
            {CALL_FIT_NOTE[call.fit].text}
          </Badge>
        ) : null}
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
            {state.fit ? (
              <div className="border-navy-soft flex flex-col gap-1.5 rounded-[10px] border-2 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={FIT[state.fit.level].variant}>{FIT[state.fit.level].text}</Badge>
                  <Badge variant="ai">Propozycja AI</Badge>
                </div>
                <p className="text-base">{state.fit.note}</p>
              </div>
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
                {section.sources?.length ? (
                  <p className="text-muted-foreground text-base">
                    Na podstawie: {section.sources.join(", ")}
                  </p>
                ) : null}
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
            {state.missing?.length ? (
              <div className="bg-warning-soft flex flex-col gap-1 rounded-[10px] px-4 py-3 text-base">
                <p className="font-bold">Zanim złożysz wniosek, dopisz:</p>
                <ul className="list-disc pl-6">
                  {state.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : null}
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
