import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "../_components/admin-nav";
import { FocusHeading } from "@/components/ui/param-focus";
import { loadSentCard, loadSentCards } from "../_lib/cards";
import { formatSentAt } from "../_lib/format";

export const metadata: Metadata = { title: "Karty usług – Panel ROPS – HubMI.pl" };

const MUNICIPALITY: Record<string, string> = {
  wiejska: "gmina wiejska",
  "miejsko-wiejska": "gmina miejsko-wiejska",
  miejska: "gmina miejska",
  powiat: "powiat",
};

// Service cards sent from the Middleman (module VII) for ROPS consultation. Role checked in ../layout.tsx.
export default async function CardsPage({ searchParams }: PageProps<"/admin/cards">) {
  const params = await searchParams;
  const supabase = await createClient();
  const cards = await loadSentCards(supabase);
  const selectedId = (typeof params.card === "string" && params.card) || cards[0]?.id || null;
  const card = selectedId ? await loadSentCard(supabase, selectedId) : null;

  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <AdminNav current="/admin/cards" />
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap gap-10 px-4 pt-8 pb-16 sm:px-10">
        <section
          aria-labelledby="cards-heading"
          className="flex min-w-0 flex-[1_1_320px] flex-col gap-3"
        >
          <h1 id="cards-heading" className="font-heading text-2xl font-bold">
            Karty usług do konsultacji
          </h1>
          <p className="text-muted-foreground text-base">
            Gminy i organizacje przygotowują je w module „Karta usługi” i wysyłają do ROPS.
          </p>
          {cards.length === 0 ? (
            <Card>
              <p>Nie ma jeszcze wysłanych kart.</p>
            </Card>
          ) : (
            <ul className="border-border overflow-hidden rounded-xl border bg-white">
              {cards.map((c) => {
                const active = c.id === card?.id;
                return (
                  <li key={c.id} className="border-border border-b last:border-b-0">
                    <Link
                      href={`/admin/cards?card=${c.id}`}
                      aria-current={active ? "true" : undefined}
                      className={`text-ink hover:bg-navy-soft/40 flex flex-col gap-0.5 px-4 py-3 no-underline ${
                        active ? "bg-navy-soft/50 shadow-[inset_4px_0_0_var(--navy)]" : ""
                      }`}
                    >
                      <strong>{c.title}</strong>
                      <span className="text-muted-foreground text-base">
                        {c.institution} · {formatSentAt(c.updatedAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {card ? (
          <article
            aria-labelledby="card-heading"
            className="flex min-w-0 flex-[999_1_560px] flex-col gap-4"
          >
            <Card className="border-t-navy flex flex-col gap-4 border-t-4 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="ai">Propozycja AI</Badge>
                <span className="text-muted-foreground text-base">szkic {card.version}</span>
              </div>
              {/* Picking a card (?card=) moves focus here */}
              <FocusHeading
                id="card-heading"
                focusKey={typeof params.card === "string" ? params.card : null}
                className="font-heading text-[1.75rem] font-bold"
              >
                {card.title}
              </FocusHeading>
              <p className="text-base">
                <strong>{card.institution}</strong>
                {card.profile ? ` · ${MUNICIPALITY[card.profile.municipality_kind] ?? ""}` : null}
                {card.ownerName ? ` · konto: ${card.ownerName}` : null}
              </p>
              <p className="text-base">
                Na podstawie innowacji:{" "}
                <Link href={`/library/${card.innovationId}`}>
                  {card.innovationName ?? card.innovationId}
                </Link>
              </p>
              {card.profile?.staff || card.profile?.constraints ? (
                <div className="bg-neutral-soft flex flex-col gap-1 rounded-[10px] p-3 text-base">
                  {card.profile.staff ? (
                    <p>
                      <strong>Kadra:</strong> {card.profile.staff}
                    </p>
                  ) : null}
                  {card.profile.constraints ? (
                    <p>
                      <strong>Ograniczenia:</strong> {card.profile.constraints}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <Section title="Dla kogo w gminie">{card.forWhom}</Section>
              <Section title="Jak to działa w praktyce">
                <ol className="list-decimal pl-6">
                  {card.howItWorks.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </Section>
              <Section title="Kto realizuje">{card.whoDelivers}</Section>
              <Section title="Koszty">
                {card.costEstimate ?? "Do uzupełnienia przez instytucję."}
                {card.fundingHint ? ` ${card.fundingHint}` : ""}
              </Section>
              <Section title="Na co uważać">{card.risks}</Section>
              <Section title="Pierwsze trzy kroki">
                <ol className="list-decimal pl-6">
                  {card.firstSteps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </Section>
            </Card>
            <Link
              href={`/my/messages/new?to=${card.ownerId}&topic=${encodeURIComponent(`Karta usługi: ${card.title}`)}`}
              className={`${buttonVariants()} self-start`}
            >
              Napisz do instytucji
            </Link>
          </article>
        ) : selectedId ? (
          <p className="flex-[999_1_560px]">
            Nie znaleziono tej karty albo nie została wysłana do ROPS.
          </p>
        ) : null}
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="font-bold">{title}</h3>
      <div className="text-base">{children}</div>
    </section>
  );
}
