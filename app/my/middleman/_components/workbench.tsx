"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { announce } from "@/components/ui/announcer";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { focusElement, useFocusFirstError } from "@/components/ui/focus";
import { Input, Textarea } from "@/components/ui/input";
import type { CallSummary } from "@/lib/contracts/ai";
import type { InstitutionProfile, ServiceCard, ServiceCardEdit } from "@/lib/contracts/middleman";
import { askRopsUrl } from "@/app/library/_lib/format";
import { AiProgress } from "@/app/match/_components/ai-progress";
import { fromLines, MUNICIPALITY_OPTIONS, toLines, TYPE_OPTIONS } from "../_lib/institution";
import { ServiceCardBody, ServiceCardFacts } from "./service-card-view";

const SELECT =
  "border-input text-ink hover:border-ink-muted focus:border-navy w-full rounded-[10px] border bg-white px-3.5 py-3 text-lg transition-[border-color,box-shadow] duration-200 focus:shadow-[0_0_0_1px_var(--navy)]";

const LINK = "text-navy hover:text-navy-strong underline underline-offset-[3px]";

const STEPS = [
  "Czytam kartę innowacji…",
  "Dopasowuję usługę do Twojej instytucji…",
  "Opisuję, jak to działa krok po kroku…",
  "Sprawdzam ryzyka i pierwsze kroki…",
];

// The whole path in three steps, so a first-time visitor knows where the card ends up.
export const HOW_IT_WORKS = [
  "Wybierz innowację i opisz swoją instytucję.",
  "AI przygotuje szkic usługi, a Ty go poprawisz.",
  "Wyślij go do ROPS. Odpowiedź przyjdzie w Wiadomościach.",
];

// Ids of the elements that take focus after an action replaced the control the user pressed
// (WCAG 2.4.3): the new card's title, the first field of the edit form, "Edytuj szkic" again,
// or the "Wysłano" confirmation that replaced the send button.
export const FOCUS = {
  cardTitle: "card-title",
  editFirstField: "edit-title",
  editButton: "edit-draft",
  sent: "sent-status",
} as const;

type Props = {
  innovations: { id: string; nazwa: string }[];
  initialInnovationId: string;
  initialInstitution: InstitutionProfile;
  cards: ServiceCard[];
  initialCardId: string | null;
  calls: CallSummary[];
};

async function call(url: string, method: string, body?: unknown) {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return res.ok
      ? { card: data as ServiceCard }
      : { error: data?.error ?? "Coś poszło nie tak. Spróbuj ponownie." };
  } catch {
    return { error: "Brak połączenia. Sprawdź internet i spróbuj ponownie." };
  }
}

export function MiddlemanWorkbench(props: Props) {
  const [innovationId, setInnovationId] = useState(props.initialInnovationId);
  const [institution, setInstitution] = useState<InstitutionProfile>(props.initialInstitution);
  const [cards, setCards] = useState(props.cards);
  const [card, setCard] = useState<ServiceCard | null>(
    props.cards.find((c) => c.id === props.initialCardId) ?? null,
  );
  const [busy, setBusy] = useState<null | "drafting" | "saving" | "sending">(null);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  // Counts failed drafts, so each one moves focus back to the invalid field
  const [failedDrafts, setFailedDrafts] = useState(0);
  const [editing, setEditing] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ id: string; n: number } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useFocusFirstError(formRef, failedDrafts || undefined);
  useEffect(() => {
    if (focusRequest) focusElement(document.getElementById(focusRequest.id));
  }, [focusRequest]);
  // Focus after the next render, once the target exists
  const focusAfterRender = (id: string) => setFocusRequest((f) => ({ id, n: (f?.n ?? 0) + 1 }));

  function fail(message: string) {
    setError(message);
    announce(message);
  }

  const set = <K extends keyof InstitutionProfile>(key: K, value: InstitutionProfile[K]) =>
    setInstitution((i) => ({ ...i, [key]: value }));

  function show(next: ServiceCard) {
    setCard(next);
    setCards((all) => [next, ...all.filter((c) => c.id !== next.id)]);
    window.history.replaceState(null, "", `/my/middleman?card=${next.id}`);
  }

  async function draft() {
    if (institution.name.trim().length < 2) {
      setNameError("Wpisz nazwę instytucji, np. GOPS w Przykładowej Woli.");
      setFailedDrafts((n) => n + 1);
      return;
    }
    setNameError(null);
    setBusy("drafting");
    setError(null);
    setEditing(false);
    announce("AI przygotowuje szkic karty usługi. To potrwa kilka sekund.");
    const result = await call("/api/ai/middleman", "POST", {
      innovation_id: innovationId,
      institution: {
        ...institution,
        name: institution.name.trim(),
        staff: institution.staff?.trim() || undefined,
        constraints: institution.constraints?.trim() || undefined,
      },
    });
    setBusy(null);
    if (result.error) return fail(result.error);
    show(result.card!);
    focusAfterRender(FOCUS.cardTitle);
  }

  async function save(edit: ServiceCardEdit) {
    setBusy("saving");
    setError(null);
    const result = await call(`/api/ai/middleman/${card!.id}`, "PATCH", edit);
    setBusy(null);
    if (result.error) return fail(result.error);
    show(result.card!);
    setEditing(false);
    announce("Zapisano zmiany w szkicu.");
    focusAfterRender(FOCUS.editButton);
  }

  async function send() {
    setBusy("sending");
    setError(null);
    const result = await call(`/api/ai/middleman/${card!.id}/send`, "POST");
    setBusy(null);
    if (result.error) return fail(result.error);
    show(result.card!);
    // Focusing the confirmation reads it once; it is not a live region, so it isn't read twice
    focusAfterRender(FOCUS.sent);
  }

  const sent = card?.status === "wyslana_do_rops";

  return (
    <>
      <section className="border-line border-b bg-white print:hidden">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-10 pb-8 sm:px-10">
          <h1 className="text-[clamp(2rem,5vw,2.5rem)] leading-tight font-bold">
            Karta usługi dla Twojej gminy
          </h1>
          <p className="text-ink-muted max-w-[820px]">
            Zamień innowację z Biblioteki w szkic usługi, którą Twoja instytucja może zamówić i
            sfinansować. Ty decydujesz, co w nim zostaje.
          </p>
          <ol aria-label="Jak to działa" className="flex max-w-[1000px] flex-wrap gap-x-8 gap-y-2">
            {HOW_IT_WORKS.map((text, n) => (
              <li key={text} className="flex items-baseline gap-2.5 text-base">
                <span
                  aria-hidden="true"
                  className="border-navy text-navy flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[0.8125rem] font-bold"
                >
                  {n + 1}
                </span>
                {text}
              </li>
            ))}
          </ol>
          <div ref={formRef} className="flex max-w-[1000px] flex-col gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <Field label="Innowacja" className="flex-[1_1_320px]">
                {(p) => (
                  <select
                    {...p}
                    className={SELECT}
                    value={innovationId}
                    onChange={(e) => setInnovationId(e.target.value)}
                  >
                    {props.innovations.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nazwa}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field
                label="Nazwa instytucji"
                error={nameError}
                required
                className="flex-[1_1_280px]"
              >
                {(p) => (
                  <Input
                    {...p}
                    value={institution.name}
                    placeholder="np. GOPS w Przykładowej Woli"
                    required
                    autoComplete="organization"
                    onChange={(e) => set("name", e.target.value)}
                  />
                )}
              </Field>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <Field label="Rodzaj instytucji" className="flex-[1_1_280px]">
                {(p) => (
                  <select
                    {...p}
                    className={SELECT}
                    value={institution.type}
                    onChange={(e) => set("type", e.target.value as InstitutionProfile["type"])}
                  >
                    {TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Rodzaj gminy lub powiat" className="flex-[1_1_220px]">
                {(p) => (
                  <select
                    {...p}
                    className={SELECT}
                    value={institution.municipality_kind}
                    onChange={(e) =>
                      set(
                        "municipality_kind",
                        e.target.value as InstitutionProfile["municipality_kind"],
                      )
                    }
                  >
                    {MUNICIPALITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            <div className="flex flex-wrap gap-4">
              <Field
                label="Kto mógłby to prowadzić (nieobowiązkowo)"
                hint="Np. dwie pracownice socjalne, asystent rodziny."
                className="flex-[1_1_320px]"
              >
                {(p) => (
                  <Textarea
                    {...p}
                    rows={2}
                    maxLength={500}
                    value={institution.staff ?? ""}
                    onChange={(e) => set("staff", e.target.value)}
                  />
                )}
              </Field>
              <Field
                label="Ograniczenia (nieobowiązkowo)"
                hint="Np. brak samochodu, mały budżet, daleko do szpitala."
                className="flex-[1_1_320px]"
              >
                {(p) => (
                  <Textarea
                    {...p}
                    rows={2}
                    maxLength={500}
                    value={institution.constraints ?? ""}
                    onChange={(e) => set("constraints", e.target.value)}
                  />
                )}
              </Field>
            </div>
            <div>
              <Button type="button" onClick={draft} disabled={busy !== null}>
                {busy === "drafting" ? "Przygotowuję…" : "Przygotuj szkic"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 pt-8 pb-16 sm:px-10">
        {/* Errors and progress are announced through announce(); no live region of their own */}
        {error ? (
          <div className="mb-5 flex flex-col gap-2">
            <p className="text-danger font-bold">{error}</p>
            {/* Not a dead end: the innovation card and a question to ROPS work without the AI */}
            <p>
              W tym czasie możesz{" "}
              <Link href={`/library/${innovationId}`} className={LINK}>
                przeczytać kartę wybranej innowacji
              </Link>{" "}
              albo{" "}
              <Link
                href={askRopsUrl(
                  innovationId,
                  props.innovations.find((i) => i.id === innovationId)?.nazwa ?? "",
                )}
                className={LINK}
              >
                zapytać o nią ROPS
              </Link>
              .
            </p>
          </div>
        ) : null}
        {busy === "drafting" ? (
          <AiProgress title="AI przygotowuje szkic karty usługi" steps={STEPS} note={null} />
        ) : null}

        {card && busy !== "drafting" ? (
          <div className="flex flex-wrap gap-12">
            <div className="min-w-0 flex-[999_1_560px]">
              {editing ? (
                <EditForm
                  card={card}
                  saving={busy === "saving"}
                  onSave={save}
                  onCancel={() => {
                    setEditing(false);
                    focusAfterRender(FOCUS.editButton);
                  }}
                />
              ) : (
                <ServiceCardBody card={card} />
              )}
            </div>
            <aside
              aria-label="Działania i źródła"
              className="flex max-w-[360px] flex-[1_1_300px] flex-col gap-5"
            >
              <div className="flex flex-col gap-2.5 print:hidden">
                {sent ? (
                  <p id={FOCUS.sent} className="text-success font-bold">
                    Wysłano do ROPS. Odpowiedź zobaczysz w Wiadomościach.
                  </p>
                ) : (
                  <Button type="button" onClick={send} disabled={busy !== null || editing}>
                    {busy === "sending" ? "Wysyłam…" : "Poproś ROPS o opinię"}
                  </Button>
                )}
                {!sent && !editing ? (
                  <Button
                    id={FOCUS.editButton}
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditing(true);
                      focusAfterRender(FOCUS.editFirstField);
                    }}
                    disabled={busy !== null}
                  >
                    Edytuj szkic
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => window.print()}
                  disabled={editing}
                >
                  Drukuj albo zapisz jako PDF
                </Button>
              </div>
              <ServiceCardFacts card={card} calls={props.calls} />
            </aside>
          </div>
        ) : null}

        {cards.length > 1 || (cards.length === 1 && !card) ? (
          <nav
            aria-label="Twoje karty usług"
            className="border-border mt-12 border-t pt-6 print:hidden"
          >
            <h2 className="mb-3 text-[1.375rem] font-bold">Twoje karty usług</h2>
            <ul className="flex flex-col gap-2">
              {cards.map((c) => (
                <li key={c.id}>
                  {/* A link (it opens a card and changes the address), handled on the client */}
                  <a
                    href={`/my/middleman?card=${c.id}`}
                    className="text-navy hover:text-navy-strong inline-flex min-h-11 items-center text-left underline underline-offset-[3px]"
                    aria-current={c.id === card?.id ? "true" : undefined}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                      e.preventDefault();
                      setEditing(false);
                      show(c);
                      focusAfterRender(FOCUS.cardTitle);
                    }}
                  >
                    {c.title}
                  </a>{" "}
                  <span className="text-ink-muted text-base">
                    · {c.based_on.nazwa} ·{" "}
                    {c.status === "wyslana_do_rops"
                      ? "wysłana do ROPS"
                      : `szkic, wersja ${c.version}`}
                  </span>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </>
  );
}

function EditForm({
  card,
  saving,
  onSave,
  onCancel,
}: {
  card: ServiceCard;
  saving: boolean;
  onSave: (edit: ServiceCardEdit) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState({
    title: card.title,
    for_whom: card.for_whom,
    how_it_works: toLines(card.how_it_works),
    who_delivers: card.who_delivers,
    cost_estimate: card.cost.estimate ?? "",
    risks: card.risks,
    first_steps: toLines(card.first_steps),
  });
  const field = (key: keyof typeof v) => ({
    value: v[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setV((x) => ({ ...x, [key]: e.target.value })),
  });
  return (
    <form
      aria-label="Edycja karty usługi"
      className="border-border flex flex-col gap-4 rounded-xl border bg-white p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          title: v.title,
          for_whom: v.for_whom,
          how_it_works: fromLines(v.how_it_works),
          who_delivers: v.who_delivers,
          cost_estimate: v.cost_estimate.trim() || null,
          risks: v.risks,
          first_steps: fromLines(v.first_steps),
        });
      }}
    >
      <Field label="Nazwa usługi" id={FOCUS.editFirstField} required>
        {(p) => <Input {...p} {...field("title")} required />}
      </Field>
      <Field label="Dla kogo w gminie" required>
        {(p) => <Textarea {...p} {...field("for_whom")} required />}
      </Field>
      <Field label="Jak to działa w praktyce" hint="Jeden krok w linii." required>
        {(p) => <Textarea {...p} rows={5} {...field("how_it_works")} required />}
      </Field>
      <Field label="Kto realizuje" required>
        {(p) => <Textarea {...p} {...field("who_delivers")} required />}
      </Field>
      <Field
        label="Szacunkowy koszt (nieobowiązkowo)"
        hint="Uzupełnia instytucja, np. po rozmowie z księgowością."
      >
        {(p) => <Input {...p} {...field("cost_estimate")} />}
      </Field>
      <Field label="Na co uważać" required>
        {(p) => <Textarea {...p} {...field("risks")} required />}
      </Field>
      <Field label="Pierwsze kroki" hint="Jeden krok w linii." required>
        {(p) => <Textarea {...p} rows={3} {...field("first_steps")} required />}
      </Field>
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={saving}>
          {saving ? "Zapisuję…" : "Zapisz zmiany"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}
