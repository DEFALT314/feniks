import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Innovation } from "@/lib/contracts/knowledge-base";
import { getChallengeAreas } from "@/app/mapa-wyzwan/_lib/data";
import { getInnovations, getInnovationById, getCategories } from "../_lib/data";
import { similarInnovations, challengesForInnovation } from "../_lib/related";

// Full program names for Library labels
const PROGRAMS: Record<string, string> = {
  IWS: "Inkubator Włączenia Społecznego",
  MIWS: "Małopolski Inkubator Włączenia Społecznego",
  MIIS: "Małopolski Inkubator Innowacji Społecznych",
  "Inkubator Dostępności": "Inkubator Dostępności",
};

const LINK = "text-navy underline underline-offset-[3px] hover:text-navy-strong";
const FOCUS = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick";
const BUTTON = `inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[10px] px-[22px] text-[1.0625rem] font-bold no-underline ${FOCUS}`;
const BADGE = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold";

export async function generateMetadata({
  params,
}: PageProps<"/biblioteka/[id]">): Promise<Metadata> {
  const i = await getInnovationById((await params).id);
  return {
    title: i
      ? `${i.nazwa} – Biblioteka innowacji – HubMI.pl`
      : "Nie ma takiej innowacji – HubMI.pl",
    description: i?.opis_krotki ?? undefined,
  };
}

export default async function InnovationPage({ params }: PageProps<"/biblioteka/[id]">) {
  const { id } = await params;
  const [i, catalog, categories, areas] = await Promise.all([
    getInnovationById(id),
    getInnovations(),
    getCategories(),
    getChallengeAreas(),
  ]);
  if (!i || !i.opublikowana) notFound();

  const category = categories.find((k) => k.id === i.kategoria_id);
  const program = i.program ?? (i.etykieta ? (PROGRAMS[i.etykieta] ?? i.etykieta) : null);
  const similar = similarInnovations(i, catalog);
  const challenges = challengesForInnovation(i, areas);

  return (
    <main id="tresc" className="bg-surface text-ink text-lg leading-relaxed">
      <div className="border-line border-b bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-4 pt-5 pb-9 sm:px-10">
          <nav aria-label="Ścieżka" className="text-base">
            <ol className="flex flex-wrap gap-1">
              <li>
                <Link href="/biblioteka" className={LINK}>
                  Biblioteka
                </Link>{" "}
                ›
              </li>
              {category ? (
                <li>
                  <Link href={`/biblioteka?kategoria=${category.id}`} className={LINK}>
                    {category.nazwa}
                  </Link>{" "}
                  ›
                </li>
              ) : null}
              <li aria-current="page" className="text-ink-muted">
                {i.nazwa}
              </li>
            </ol>
          </nav>
          <h1 className="max-w-[900px] text-[clamp(2rem,5vw,2.75rem)] leading-tight font-bold tracking-tight">
            {i.nazwa}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {i.sprawdzona_przez_rops ? (
              <span className={`${BADGE} bg-success-soft text-success`}>
                Wybrana do upowszechniania
              </span>
            ) : null}
            {i.opis_niepelny ? (
              <span className={`${BADGE} bg-warning-soft text-warning`}>Opis niepełny</span>
            ) : null}
            {program ? <span className="text-ink-muted text-base">{program}</span> : null}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-12 px-4 pt-4 pb-16 sm:px-10">
        <article className="flex min-w-0 flex-[999_1_560px] flex-col">
          {i.opis_niepelny ? (
            <Section title="Co wiemy" first>
              <p>
                Znamy nazwę, program i autora tej innowacji. Opis poniżej wynika tylko z tytułu.
                Pełny opis uzupełni ROPS.
              </p>
            </Section>
          ) : null}
          {i.opis_krotki ? (
            <Section title="Na czym polega" first={!i.opis_niepelny}>
              <p>{i.opis_krotki}</p>
            </Section>
          ) : null}
          {i.problem ? (
            <Section title="Jaki problem rozwiązuje">
              <p>{i.problem}</p>
            </Section>
          ) : null}
          <BulletSection title="Dla kogo" items={i.dla_kogo} />
          <BulletSection title="Kto może wdrożyć" items={i.kto_moze_wdrozyc} />
          <Section title="Czy to działa">
            <p>{i.czy_dziala ?? "Test jeszcze trwa albo źródła nie podają wyników."}</p>
          </Section>
          {challenges.length > 0 ? (
            <Section title="Wyzwania z Mapy Wyzwań">
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {challenges.map(({ area, challenge }) => (
                  <li key={challenge.id}>
                    <Link href={`/mapa-wyzwan?obszar=${area.id}#obszar`} className={LINK}>
                      {area.nazwa}: {challenge.tekst}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {i.zrodlo ? (
            <p className="text-ink-muted pt-4 text-base">Źródło opisu: {i.zrodlo}</p>
          ) : null}
        </article>

        <aside
          aria-label="Materiały i działania"
          className="flex max-w-[380px] flex-[1_1_320px] flex-col gap-5 pt-6"
        >
          <div className="border-line border-t-navy flex flex-col gap-3 rounded-xl border border-t-4 bg-white p-6">
            <h2 className="text-[1.1875rem] font-bold">Chcesz to wdrożyć?</h2>
            <Link
              href={`/moje/middleman?innowacja=${encodeURIComponent(i.id)}`}
              className={`${BUTTON} bg-navy hover:bg-navy-strong text-white`}
            >
              Przygotuj kartę usługi
            </Link>
            <Link
              href={`/moje/wiadomosci?innowacja=${encodeURIComponent(i.id)}`}
              className={`${BUTTON} border-navy text-navy border bg-white`}
            >
              Zapytaj ROPS
            </Link>
          </div>
          <MaterialsPanel innovation={i} />
          {similar.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[1.0625rem] font-bold">Podobne innowacje</h2>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {similar.map((p) => (
                  <li key={p.id}>
                    <Link href={`/biblioteka/${p.id}`} className={LINK}>
                      {p.nazwa}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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

function BulletSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Section title={title}>
      <ul className="m-0 list-disc pl-[22px]">
        {items.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </Section>
  );
}

function MaterialsPanel({ innovation: i }: { innovation: Innovation }) {
  const files = [
    { label: "Opis modelu", kind: "PDF", url: i.materialy.opis_pdf },
    { label: "Film o innowacji", kind: "YouTube", url: i.materialy.film },
    { label: "Pakiet materiałów", kind: "ZIP", url: i.materialy.pakiet_zip },
    { label: "Zasady wykorzystania", kind: "PDF", url: i.materialy.zasady_wykorzystania },
    ...i.materialy.inne.map((url, n) => ({
      label: `Materiał dodatkowy ${n + 1}`,
      kind: "plik",
      url,
    })),
  ].filter((p): p is { label: string; kind: string; url: string } => Boolean(p.url));

  return (
    <div className="border-line rounded-xl border bg-white px-6 pt-2 pb-5">
      <h2 className="sr-only">Materiały</h2>
      {files.length > 0 ? (
        <ul className="m-0 list-none p-0">
          {files.map((p) => (
            <li key={p.url}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`border-line text-navy flex min-h-12 items-center justify-between gap-3 border-b py-3 no-underline hover:underline ${FOCUS}`}
              >
                <span>
                  {p.label}
                  <span className="sr-only"> (otwiera się w nowej karcie)</span>
                </span>
                <span className="text-ink-muted text-[0.9375rem]">{p.kind}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-muted py-3">Brak materiałów do pobrania.</p>
      )}
      <p className="pt-3 text-base">
        <a href={i.url} target="_blank" rel="noopener noreferrer" className={`${LINK} ${FOCUS}`}>
          {i.spoza_biblioteki ? "Źródło na stronie programu ↗" : "Pełna karta na stronie ROPS ↗"}
          <span className="sr-only"> (otwiera się w nowej karcie)</span>
        </a>
      </p>
    </div>
  );
}
