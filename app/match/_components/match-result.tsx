import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MatchResponse, MatchedInnovation, TextSegment } from "@/lib/contracts/match";
import { cn } from "@/lib/utils";
import { AiProgress } from "./ai-progress";
import { reportNeedHref } from "../_lib/request";

// The result of /match, laid out as in design/makiety/Dopasuj.dc.html: description → challenge → innovations.

const LINK =
  "text-navy underline underline-offset-[3px] hover:text-navy-strong hover:underline-offset-[5px]";

// The decisive words: a highlighter band as in the mockup plus an underline, so they are not shown
// by colour alone (WCAG 1.4.1). Screen readers don't announce <mark>, so the words are also listed
// in text after the passage. Forced colours: app/globals.css gives <mark> the system Mark colours.
export const HIGHLIGHT_LEGEND = "Podkreślone słowa zdecydowały o dopasowaniu.";

export function Highlighted({ segments }: { segments: TextSegment[] }) {
  const words = segments.filter((s) => s.highlight).map((s) => s.text.trim());
  return (
    <>
      {segments.map((s, n) =>
        s.highlight ? (
          <mark
            key={n}
            className="decoration-warning bg-transparent bg-[linear-gradient(transparent_55%,#ffe08a_55%)] px-px text-inherit underline decoration-2 underline-offset-4"
          >
            {s.text}
          </mark>
        ) : (
          <span key={n}>{s.text}</span>
        ),
      )}
      {words.length ? (
        <span className="sr-only">
          {" "}
          (Słowa, które zdecydowały o dopasowaniu: {words.join(", ")}.)
        </span>
      ) : null}
    </>
  );
}

function Step({
  n,
  title,
  active,
  children,
}: {
  n: number;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="relative pb-7 pl-11 before:absolute before:top-7 before:bottom-0 before:left-[11px] before:w-0.5 before:bg-[#b8c0cd] last:pb-0 last:before:hidden">
      <span
        aria-hidden="true"
        className={cn(
          "border-navy absolute top-0.5 left-0 flex size-6 items-center justify-center rounded-full border-2 text-[0.8125rem] font-bold",
          active ? "bg-navy text-white" : "text-navy bg-white",
        )}
      >
        {n}
      </span>
      {/* Not a heading: the innovation names below are the h3s (the spec allows h1–h3 only) */}
      <p className="text-ink-muted mb-1.5 font-sans text-[0.9375rem] font-bold tracking-normal">
        {title}
      </p>
      {children}
    </li>
  );
}

function origin(m: MatchedInnovation): string | null {
  if (m.innovation.sprawdzona_przez_rops) return null;
  return m.innovation.etykieta ? `Z inkubatora ${m.innovation.etykieta}` : null;
}

function InnovationCard({
  match,
  first,
  ai,
  preliminary,
}: {
  match: MatchedInnovation;
  first: boolean;
  ai: boolean;
  preliminary: boolean;
}) {
  const i = match.innovation;
  const tag = origin(match);
  return (
    <article
      className={cn(
        "border-border flex flex-col gap-2.5 rounded-xl border bg-white p-6",
        first && "border-l-navy border-l-4",
        // Preliminary (before the AI choice): a dashed border and a label, not dimmed text,
        // so contrast stays at 4.5:1 (WCAG 1.4.3)
        preliminary && "border-field-border border-dashed",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3
          className={cn("leading-snug font-bold", first ? "text-[1.4375rem]" : "text-[1.3125rem]")}
        >
          {i.nazwa}
        </h3>
        <span className="flex flex-wrap gap-2">
          {preliminary ? <Badge>Wstępny wynik</Badge> : null}
          {i.sprawdzona_przez_rops ? (
            <Badge variant="success">Sprawdzona przez ROPS</Badge>
          ) : tag ? (
            <Badge>{tag}</Badge>
          ) : null}
        </span>
      </div>
      {i.opis_krotki ? (
        <p>
          <Highlighted segments={match.summary_segments} />
        </p>
      ) : null}
      {ai ? (
        <p>
          <span className="font-bold">Dlaczego pasuje</span> <AiNote />
          {": "}
          {match.reason}
          {match.quote ? <span className="text-ink-muted"> Z opisu: „{match.quote}”.</span> : null}
        </p>
      ) : null}
      {i.kto_moze_wdrozyc.length ? (
        <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1 text-base">
          <dt className="text-ink-muted">Kto wdraża</dt>
          <dd>{i.kto_moze_wdrozyc.join(", ")}</dd>
        </dl>
      ) : null}
      {first ? (
        <div className="mt-1 flex flex-wrap gap-2.5">
          <Link href={`/library/${i.id}`} className={buttonVariants()}>
            Zobacz kartę<span className="sr-only">: {i.nazwa}</span>
          </Link>
          <Link
            href={`/my/middleman?innovation=${i.id}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Przygotuj dla mojej gminy
          </Link>
        </div>
      ) : (
        <Link
          href={`/library/${i.id}`}
          className={cn(LINK, "inline-flex min-h-11 items-center self-start font-bold")}
        >
          Zobacz kartę<span className="sr-only">: {i.nazwa}</span>
          <span aria-hidden="true">&nbsp;→</span>
        </Link>
      )}
    </article>
  );
}

// One sentence of the summary, so a name like "Urzędowy ambaras" says what the innovation does.
export function shortSummary(text: string | null, max = 140): string | null {
  if (!text) return null;
  // A sentence ends before a capital letter, so "m.in." or "np." does not cut it short.
  const first = text.trim().split(/(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ„"])/)[0];
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[,;:–-]\s*$/, "")}…`;
}

// Further results from the ranking (not judged by the AI). When nothing above fits, they are
// all there is to see: then they are called the closest finds and shown open.
function MoreInnovations({ result }: { result: MatchResponse }) {
  const nothingAbove = result.innovations.length === 0;
  const title = nothingAbove ? "Najbliższe, co znaleźliśmy" : "Inne innowacje, które mogą pasować";
  return (
    <details className="mt-6" open={nothingAbove || undefined}>
      <summary className="text-navy cursor-pointer py-2.5 font-bold">
        {title} ({result.more.length})
      </summary>
      <p className="text-ink-muted mt-2 text-[0.9375rem]">
        {result.picked_by === "ai"
          ? "Mniej podobne do Twojego opisu. Wybrała je wyszukiwarka, AI ich nie oceniała."
          : "Mniej podobne do Twojego opisu niż te powyżej."}
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {result.more.map((m) => {
          const summary = shortSummary(m.opis_krotki);
          return (
            <li key={m.id} className="border-border border-l-2 pl-4">
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link
                  href={`/library/${m.id}`}
                  className={cn(LINK, "inline-flex min-h-11 items-center font-bold")}
                >
                  {m.nazwa}
                </Link>
                {m.sprawdzona_przez_rops ? (
                  <Badge variant="success">Sprawdzona przez ROPS</Badge>
                ) : null}
              </span>
              {summary ? <span className="block text-base">{summary}</span> : null}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

// Every AI sentence carries the label (CLAUDE.md, rule 5), not only the heading of the result.
function AiNote() {
  return <span className="text-navy text-[0.9375rem] font-bold">(Propozycja AI)</span>;
}

export function MatchResult({ result, choosing }: { result: MatchResponse; choosing: boolean }) {
  const ai = result.picked_by === "ai";
  const weak = result.match_quality === "weak";
  return (
    <>
      <div className="mb-7 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="result-title" className="text-[2rem] leading-tight font-bold">
          Wynik
        </h2>
        {ai ? <Badge variant="ai">Propozycja AI, wybór należy do Ciebie</Badge> : null}
      </div>

      <ol className="m-0 list-none p-0">
        <Step n={1} title="Twój opis">
          <p>
            <Highlighted segments={result.description_segments} />
          </p>
          {result.description_segments.some((s) => s.highlight) ? (
            <p className="text-ink-muted mt-1 text-base">{HIGHLIGHT_LEGEND}</p>
          ) : null}
        </Step>

        {result.challenge ? (
          <Step n={2} title="Wyzwanie z Mapy Wyzwań ROPS">
            <p>
              <strong>{result.challenge.area_name}:</strong> {result.challenge.challenge_text ?? ""}{" "}
              <Link href={`/challenge-map?area=${result.challenge.area_id}#area`} className={LINK}>
                Zobacz obszar<span className="sr-only">: {result.challenge.area_name}</span>
              </Link>
            </p>
          </Step>
        ) : null}

        <Step
          n={result.challenge ? 3 : 2}
          title={choosing ? "Wstępne wyniki wyszukiwania" : "Pasujące innowacje"}
          active
        >
          {choosing ? <AiProgress /> : null}
          {result.innovations.length ? (
            <div
              // key changes when the AI answer replaces the ranking, so the cards fade in anew
              key={result.picked_by}
              className={cn(
                "flex flex-col gap-4",
                ai &&
                  "animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none",
              )}
            >
              {result.innovations.map((m, n) => (
                <InnovationCard
                  key={m.innovation.id}
                  match={m}
                  first={n === 0}
                  ai={ai}
                  preliminary={choosing}
                />
              ))}
            </div>
          ) : (
            <p>
              {result.no_match_reason ? (
                <>
                  {result.no_match_reason} <AiNote />
                </>
              ) : (
                "W Bibliotece ROPS nie ma jeszcze innowacji, która pasuje do tego problemu."
              )}
            </p>
          )}
          {result.more.length ? <MoreInnovations result={result} /> : null}
        </Step>
      </ol>

      <Card className="mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5">
        <p className="max-w-[560px]">
          {weak ? (
            <strong>Wygląda na to, że takiego rozwiązania jeszcze nie ma. </strong>
          ) : (
            "Nic nie pasuje? "
          )}
          Zgłoś potrzebę do ROPS. Trafi na Mapę Wyzwań i pomoże zaplanować kolejne nabory.
        </p>
        <Link
          href={reportNeedHref(result)}
          className={buttonVariants({ variant: weak ? "primary" : "secondary" })}
        >
          Zgłoś potrzebę
        </Link>
      </Card>
      <p className="text-ink-muted mt-4 text-[0.9375rem]">
        Model wybiera wyłącznie spośród innowacji z Biblioteki ROPS i podkreśla słowa, które
        zdecydowały o dopasowaniu. Twojego opisu nie zapisujemy, do statystyk trafia tylko obszar i
        wyzwanie.
      </p>
    </>
  );
}
