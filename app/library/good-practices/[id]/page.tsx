import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getGoodPractice } from "../../_lib/good-practices";
import {
  askAboutPracticeUrl,
  practicesTitle,
  publishedOn,
  ratingSummary,
} from "../../_lib/good-practices-format";
import { LINK, PracticesTrail, StageBadge, TARGET } from "../_components/practice-parts";

// One good practice (#104): the card fields of an approved idea, never its author (rule 8).
// Layout follows the innovation card (app/library/[id]/page.tsx).

async function load(params: PageProps<"/library/good-practices/[id]">["params"]) {
  return getGoodPractice(await createClient(), (await params).id);
}

export async function generateMetadata({
  params,
}: PageProps<"/library/good-practices/[id]">): Promise<Metadata> {
  const p = await load(params);
  return {
    title: p ? practicesTitle(p.tytul) : "Nie ma takiej dobrej praktyki – HubMI.pl",
    description: p?.istota ?? undefined,
  };
}

export default async function GoodPracticePage({
  params,
}: PageProps<"/library/good-practices/[id]">) {
  const p = await load(params);
  if (!p) notFound();
  const ratings = ratingSummary(p.liczba_ocen, p.srednia_ocena);

  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
      <div className="border-line border-b bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-4 pt-5 pb-9 sm:px-10">
          <PracticesTrail current={p.tytul} />
          <h1 className="max-w-[900px] text-[clamp(2rem,5vw,2.75rem)] leading-tight font-bold tracking-tight">
            {p.tytul}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Zatwierdzone przez ROPS</Badge>
            <StageBadge stage={p.etap} />
          </div>
          <p className="text-ink-muted max-w-[760px] text-base">
            Pomysł zgłoszony w Kreatorze pomysłów. Pokazujemy go od {publishedOn(p.opublikowany_at)}{" "}
            za zgodą osoby, która go zgłosiła. Nie podajemy, kto go zgłosił.
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-12 px-4 pt-4 pb-16 sm:px-10">
        <article className="flex min-w-0 flex-[999_1_560px] flex-col">
          {p.istota ? (
            <Section title="Na czym polega" first>
              <p className="max-w-[70ch]">{p.istota}</p>
            </Section>
          ) : null}
          {p.opis ? (
            <Section title="Jak to wygląda w praktyce" first={!p.istota}>
              <p className="max-w-[70ch] whitespace-pre-line">{p.opis}</p>
            </Section>
          ) : null}
          {p.dla_kogo ? (
            <Section title="Dla kogo">
              <p className="max-w-[70ch]">{p.dla_kogo}</p>
            </Section>
          ) : null}
          <Section title="Czy to działa">
            {ratings ? (
              <p className="max-w-[70ch]">
                Mieszkańcy sprawdzili ten pomysł w Testerze innowacji: {ratings}.
              </p>
            ) : (
              <p className="max-w-[70ch]">
                Mieszkańcy nie oceniali jeszcze tego pomysłu w Testerze innowacji.
              </p>
            )}
          </Section>
          {p.obszar_id && p.obszar_nazwa ? (
            <Section title="Na jakie wyzwania odpowiada">
              <p>
                <Link
                  href={`/challenge-map?area=${encodeURIComponent(p.obszar_id)}#area`}
                  className={`${LINK} ${TARGET}`}
                >
                  {p.obszar_nazwa}: wyzwania na Mapie wyzwań
                </Link>
              </p>
            </Section>
          ) : null}
        </article>

        <aside
          aria-labelledby="try-heading"
          className="flex max-w-[380px] flex-[1_1_320px] flex-col gap-5 pt-6"
        >
          <div className="border-line border-t-navy flex flex-col gap-3 rounded-xl border border-t-4 bg-white p-6">
            <h2 id="try-heading" className="text-[1.1875rem] font-bold">
              Chcesz to zrobić u siebie?
            </h2>
            <p className="text-base">
              Napisz do zespołu ROPS. Odpowie na pytania i podpowie, jak przenieść ten pomysł do
              Twojej gminy albo organizacji.
            </p>
            <Link href={askAboutPracticeUrl(p.tytul)} className={buttonVariants()}>
              Napisz do ROPS<span className="sr-only"> o tej dobrej praktyce</span>
            </Link>
          </div>
          <p className="text-base">
            Masz podobny pomysł?{" "}
            <Link href="/my/creator" className={LINK}>
              Zgłoś go w Kreatorze pomysłów
            </Link>
            .
          </p>
        </aside>
      </div>
    </main>
  );
}

function Section({
  title,
  first,
  children,
}: {
  title: string;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col gap-2 py-6 ${first ? "" : "border-line border-t"}`}>
      <h2 className="text-[1.375rem] font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
