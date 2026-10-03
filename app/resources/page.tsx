import type { Metadata } from "next";
import Link from "next/link";
import { ResourceFilters } from "@/lib/contracts/knowledge-base";
import { getResources } from "./_lib/data";
import { availableValues, filterResources } from "./_lib/filter";
import { GLOSSARY, GUIDES } from "./_lib/guides";

export const metadata: Metadata = {
  title: "Wiedza o innowacjach – HubMI.pl",
  description:
    "Poradniki o innowacjach społecznych, słowniczek oraz raporty i publikacje ROPS w Krakowie.",
};

// No mockup: same style as the Library (design/makiety/Biblioteka.dc.html)
const FOCUS = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick";
const LINK = `text-navy underline underline-offset-[3px] hover:text-navy-strong ${FOCUS}`;
const FIELD = `min-h-[50px] rounded-[10px] border border-field-border bg-white px-3 text-lg ${FOCUS}`;

// Polish plural forms: 1 pozycja, 2–4 pozycje, 5+ pozycji
function formatItemCount(n: number): string {
  if (n === 1) return "1 pozycja";
  const mod10 = n % 10;
  const mod100 = n % 100;
  return mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? `${n} pozycje` : `${n} pozycji`;
}

export default async function ResourcesPage({ searchParams }: PageProps<"/resources">) {
  // Empty form fields ("Wszystkie") count as no filter
  const params = Object.fromEntries(
    Object.entries(await searchParams).filter(([, v]) => typeof v === "string" && v !== ""),
  );
  const filters = ResourceFilters.safeParse(params).data ?? {};
  const resources = await getResources();
  const list = filterResources(resources, filters);
  const { years, tags } = availableValues(resources);

  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
      <section className="border-line border-b bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-11 pb-9 sm:px-10">
          <h1 className="text-[clamp(2rem,5vw,2.75rem)] leading-tight font-bold tracking-tight">
            Wiedza o innowacjach
          </h1>
          <p className="text-ink-muted max-w-[760px]">
            Krótkie poradniki, jak działać z innowacją społeczną, oraz badania i publikacje ROPS w
            Krakowie. Każdy raport prowadzi do źródła na stronie ROPS.
          </p>
          <p className="m-0 text-base">
            <a href="#poradniki" className={LINK}>
              Poradniki
            </a>{" "}
            ·{" "}
            <a href="#slowniczek" className={LINK}>
              Słowniczek
            </a>{" "}
            ·{" "}
            <a href="#results" className={LINK}>
              Raporty i publikacje
            </a>
          </p>
          <h2 className="mt-4 text-xl font-bold">Raporty i publikacje: filtry</h2>
          <form
            method="get"
            action="/resources"
            className="flex flex-wrap items-end gap-4"
            aria-label="Filtry"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="type" className="text-ink-muted text-[0.9375rem] font-bold">
                Rodzaj
              </label>
              <select id="type" name="type" defaultValue={filters.type ?? ""} className={FIELD}>
                <option value="">Wszystkie</option>
                <option value="raport">Raporty z badań</option>
                <option value="publikacja">Publikacje o innowacjach</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="year" className="text-ink-muted text-[0.9375rem] font-bold">
                Rok
              </label>
              <select
                id="year"
                name="year"
                defaultValue={filters.year ? String(filters.year) : ""}
                className={FIELD}
              >
                <option value="">Wszystkie</option>
                {years.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="tag" className="text-ink-muted text-[0.9375rem] font-bold">
                Temat
              </label>
              <select id="tag" name="tag" defaultValue={filters.tag ?? ""} className={FIELD}>
                <option value="">Wszystkie</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className={`bg-navy hover:bg-navy-strong inline-flex min-h-[50px] items-center rounded-[10px] px-[22px] text-[1.0625rem] font-bold text-white ${FOCUS}`}
            >
              Pokaż
            </button>
            <Link href="/resources" className={`inline-flex min-h-[50px] items-center ${LINK}`}>
              Wyczyść
            </Link>
          </form>
        </div>
      </section>

      <section
        id="poradniki"
        aria-labelledby="guides-heading"
        className="mx-auto flex max-w-[1200px] scroll-mt-4 flex-col gap-4 px-4 pt-10 sm:px-10"
      >
        <h2 id="guides-heading" className="text-[1.75rem] font-bold tracking-tight">
          Poradniki
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {GUIDES.map((g) => (
            <article
              key={g.id}
              aria-labelledby={`${g.id}-title`}
              className="border-line flex flex-col gap-3 rounded-xl border bg-white p-6"
            >
              <p className="text-ink-muted m-0 text-[0.9375rem] font-bold">{g.forWhom}</p>
              <h3 id={`${g.id}-title`} className="m-0 text-[1.375rem] leading-snug font-bold">
                {g.title}
              </h3>
              <p className="m-0">{g.intro}</p>
              <ol className="m-0 flex flex-col gap-1.5 pl-6">
                {g.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <ul className="m-0 mt-auto flex list-none flex-col gap-1 p-0 pt-2 text-base">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={`${LINK} font-bold`}>
                      {l.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section
        id="slowniczek"
        aria-labelledby="glossary-heading"
        className="mx-auto flex max-w-[1200px] scroll-mt-4 flex-col gap-3 px-4 pt-10 sm:px-10"
      >
        <h2 id="glossary-heading" className="text-[1.75rem] font-bold tracking-tight">
          Słowniczek
        </h2>
        <dl className="border-line m-0 grid grid-cols-1 gap-x-8 gap-y-3 rounded-xl border bg-white p-6 md:grid-cols-[minmax(10rem,14rem)_1fr]">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="contents">
              <dt className="font-bold">{g.term}</dt>
              <dd className="m-0">{g.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section
        aria-labelledby="results"
        className="mx-auto flex max-w-[1200px] flex-col px-4 pt-8 pb-16 sm:px-10"
      >
        <h2
          id="results"
          aria-live="polite"
          className="border-ink border-b-2 pb-2 text-lg font-bold"
        >
          {formatItemCount(list.length)}
        </h2>
        {list.length === 0 ? (
          <p className="py-8">Nic nie pasuje do tych filtrów.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {list.map((r) => (
              <li key={r.id} className="border-line flex flex-col gap-1.5 border-b py-5">
                <h3 className="text-xl leading-snug font-bold">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className={LINK}>
                    {r.tytul}
                    <span className="sr-only"> (otwiera się w nowej karcie)</span>
                  </a>
                </h3>
                {r.opis ? <p>{r.opis}</p> : null}
                <div className="text-ink-muted flex flex-wrap items-center gap-2 text-[0.9375rem]">
                  <span>
                    {r.typ === "raport" ? "Raport z badań" : "Publikacja"}
                    {r.rok ? ` · ${r.rok}` : ""}
                  </span>
                  {r.tagi.map((t) => (
                    <Link
                      key={t}
                      href={`/resources?tag=${encodeURIComponent(t)}`}
                      className={`bg-neutral-soft text-ink-muted inline-flex min-h-6 items-center rounded-full px-2.5 font-bold no-underline hover:underline ${FOCUS}`}
                    >
                      <span className="sr-only">Temat: </span>
                      {t}
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
