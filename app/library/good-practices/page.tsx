import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { GoodPractice } from "@/lib/contracts/idea-creator";
import { createClient } from "@/lib/supabase/server";
import { getGoodPractices } from "../_lib/good-practices";
import { practiceCountLabel, practicesTitle } from "../_lib/good-practices-format";
import { LINK, PracticesTrail, Ratings, StageBadge } from "./_components/practice-parts";

// Good practices of residents (#104, module III): ideas from the Idea creator that ROPS approved
// and shows with the author's consent. Only card fields; the author is never named (rule 8).

export const metadata: Metadata = {
  title: practicesTitle(),
  description:
    "Pomysły mieszkańców, organizacji i gmin z Małopolski, sprawdzone i zatwierdzone przez ROPS w Krakowie.",
};

export default async function GoodPracticesPage() {
  const practices = await getGoodPractices(await createClient());

  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
      <section className="border-line border-b bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-5 pb-9 sm:px-10">
          <PracticesTrail />
          <h1 className="text-[clamp(2rem,5vw,2.75rem)] leading-tight font-bold tracking-tight">
            Dobre praktyki mieszkańców
          </h1>
          <p className="text-ink-muted max-w-[760px]">
            Pomysły zgłoszone w Kreatorze pomysłów przez mieszkańców, organizacje i gminy. Każdy
            sprawdził i zatwierdził zespół ROPS, a autor zgodził się go pokazać. Nie podajemy, kto
            go zgłosił.
          </p>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-10 px-4 pt-8 pb-16 sm:px-10">
        <section aria-labelledby="practices" className="flex min-w-0 flex-[999_1_560px] flex-col">
          <h2 id="practices" className="border-ink border-b-2 pb-2 text-lg font-bold">
            {practices.length ? practiceCountLabel(practices.length) : "Dobre praktyki"}
          </h2>
          {practices.length === 0 ? (
            <div className="flex flex-col gap-3 py-8">
              <p>
                Na razie nie pokazujemy tu żadnych pomysłów. Pojawią się, gdy ROPS zatwierdzi
                zgłoszenia, a ich autorzy zgodzą się je pokazać.
              </p>
              <p>
                W tym czasie zajrzyj do{" "}
                <Link href="/library" className={LINK}>
                  Biblioteki innowacji
                </Link>
                .
              </p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {practices.map((p) => (
                <PracticeRow key={p.id} practice={p} />
              ))}
            </ul>
          )}
        </section>

        <aside
          aria-labelledby="share-heading"
          className="flex max-w-[380px] flex-[1_1_300px] flex-col"
        >
          <div className="border-line border-t-navy flex flex-col gap-3 rounded-xl border border-t-4 bg-white p-6">
            <h2 id="share-heading" className="text-[1.1875rem] font-bold">
              Masz sprawdzony pomysł?
            </h2>
            <p className="text-base">
              Opisz go w Kreatorze pomysłów i wyślij do ROPS. Przy wysyłce zdecydujesz, czy po
              zatwierdzeniu możemy pokazać go innym.
            </p>
            <Link href="/my/creator" className={buttonVariants()}>
              Zgłoś pomysł
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

function PracticeRow({ practice: p }: { practice: GoodPractice }) {
  return (
    <li className="border-line flex flex-col gap-2 border-b py-6">
      <h3 className="text-[1.375rem] leading-snug font-bold tracking-tight">
        <Link
          href={`/library/good-practices/${p.id}`}
          className="text-ink hover:text-navy no-underline hover:underline"
        >
          {p.tytul}
        </Link>
      </h3>
      {p.istota ? <p className="max-w-[70ch]">{p.istota}</p> : null}
      {p.dla_kogo ? (
        <p className="text-ink-muted max-w-[70ch] text-base">
          <span className="text-ink font-bold">Dla kogo:</span> {p.dla_kogo}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <StageBadge stage={p.etap} />
        {p.obszar_nazwa ? (
          <span className="text-ink-muted text-base">Obszar: {p.obszar_nazwa}</span>
        ) : null}
        <Ratings practice={p} className="text-ink-muted text-base" />
      </div>
    </li>
  );
}
