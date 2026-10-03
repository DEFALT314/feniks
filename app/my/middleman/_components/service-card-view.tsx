import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CallSummary } from "@/lib/contracts/ai";
import type { InstitutionFit, ServiceCard } from "@/lib/contracts/middleman";

// The service card as in design/makiety/Middleman.dc.html. AI text is labelled; facts computed
// from data (fit, materials, funding) are shown separately in the side panel.

const LINK = "text-navy underline underline-offset-[3px] hover:text-navy-strong";

const FIT_BADGE: Record<
  InstitutionFit["level"],
  { variant: "success" | "warning" | "neutral"; text: string }
> = {
  dobra: { variant: "success", text: "Pasuje do Twojej instytucji" },
  czesciowa: { variant: "warning", text: "Pasuje częściowo" },
  do_sprawdzenia: { variant: "neutral", text: "Do sprawdzenia z ROPS" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-border flex flex-col gap-1.5 border-t pt-4">
      <h3 className="text-ink-muted font-sans text-[0.9375rem] font-bold tracking-normal">
        {title}
      </h3>
      {children}
    </section>
  );
}

const institutionShort = (card: ServiceCard) => card.institution.name || "instytucję";

export function ServiceCardBody({ card }: { card: ServiceCard }) {
  const sent = card.status === "wyslana_do_rops";
  return (
    <article
      aria-labelledby="card-title"
      className="border-border flex flex-col gap-4 rounded-xl border bg-white p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Badge variant="ai">Propozycja AI, do sprawdzenia przez {institutionShort(card)}</Badge>
        <span className="text-ink-muted text-[0.9375rem]">
          {sent ? "wysłana do ROPS · " : ""}wersja {card.version}
        </span>
      </div>
      <h2 id="card-title" className="text-[1.875rem] leading-tight font-bold">
        {card.title}
      </h2>
      <Section title="Dla kogo w gminie">
        <p>{card.for_whom}</p>
      </Section>
      <Section title="Jak to działa w praktyce">
        <ol className="list-decimal pl-6">
          {card.how_it_works.map((s, n) => (
            <li key={n}>{s}</li>
          ))}
        </ol>
      </Section>
      <Section title="Kto realizuje">
        <p>{card.who_delivers}</p>
      </Section>
      <Section title="Koszt i finansowanie">
        <p>
          Szacunkowy koszt:{" "}
          {card.cost.estimate ? (
            card.cost.estimate
          ) : (
            <span className="border-ink-muted text-ink-muted border-b border-dashed">
              uzupełnia {institutionShort(card)}
            </span>
          )}
          . Źródło finansowania:{" "}
          <a href="#nabory" className={LINK}>
            {card.cost.funding_hint.replace(/\.$/, "")}
          </a>
          .
        </p>
      </Section>
      <Section title="Na co uważać">
        <p>{card.risks}</p>
      </Section>
      <Section title="Pierwsze kroki">
        <ol className="list-decimal pl-6">
          {card.first_steps.map((s, n) => (
            <li key={n}>{s}</li>
          ))}
        </ol>
      </Section>
    </article>
  );
}

// Side panel: what the card is based on, computed facts (not AI) and materials. Its labels are
// h3s under the card's h2, so screen-reader users can jump between them.
export function ServiceCardFacts({ card, calls }: { card: ServiceCard; calls: CallSummary[] }) {
  const fit = card.fit ? FIT_BADGE[card.fit.level] : null;
  return (
    <div className="flex flex-col gap-5">
      <div className="border-border flex flex-col gap-1.5 border-t pt-4">
        <h3 className="text-ink-muted font-sans text-[0.9375rem] font-bold tracking-normal">
          Na podstawie
        </h3>
        <Link
          href={`/library/${card.based_on.id}`}
          className={`${LINK} inline-flex min-h-11 items-center self-start font-bold`}
        >
          {card.based_on.nazwa}
        </Link>
        {card.based_on.sprawdzona_przez_rops ? (
          <Badge variant="success" className="self-start">
            Sprawdzona przez ROPS
          </Badge>
        ) : null}
      </div>
      {card.fit && fit ? (
        <div className="border-border flex flex-col gap-1.5 border-t pt-4">
          <h3 className="text-ink-muted font-sans text-[0.9375rem] font-bold tracking-normal">
            Czy to dla Twojej instytucji?
          </h3>
          <Badge variant={fit.variant} className="self-start">
            {fit.text}
          </Badge>
          <p className="text-base">{card.fit.note}</p>
        </div>
      ) : null}
      {card.materials?.length ? (
        <div className="border-border flex flex-col gap-1.5 border-t pt-4">
          <h3 className="text-ink-muted font-sans text-[0.9375rem] font-bold tracking-normal">
            Materiały od autorów
          </h3>
          <ul className="flex flex-col gap-1 text-base">
            {card.materials.map((m) => (
              <li key={m.url}>
                <a href={m.url} className={LINK} target="_blank" rel="noreferrer">
                  {m.label}
                  <span className="sr-only"> (otwiera się w nowej karcie)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {calls.length ? (
        <div id="nabory" className="border-border flex scroll-mt-6 flex-col gap-2 border-t pt-4">
          <h3 className="text-ink-muted font-sans text-[0.9375rem] font-bold tracking-normal">
            Aktualne nabory
          </h3>
          {calls.some((c) => c.demo) ? (
            <Badge className="self-start">Dane demonstracyjne</Badge>
          ) : null}
          <ul className="flex flex-col gap-2 text-base">
            {calls.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong>
                <span className="text-ink-muted block">{c.goal}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-ink-muted text-[0.9375rem]">
        AI pisze szkic tylko na podstawie karty innowacji i opisu Twojej instytucji. Nie podaje
        kosztów ani liczb – te pola uzupełniasz Ty. Dopasowanie i materiały pochodzą z danych ROPS,
        nie od AI.
      </p>
    </div>
  );
}
