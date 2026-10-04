import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ResourceFilters } from "@/lib/contracts/knowledge-base";
import { HashFocus } from "@/app/library/_components/hash-focus";
import { getResources } from "./_lib/data";
import { availableValues, filterResources } from "./_lib/filter";
import { GLOSSARY, GUIDES } from "./_lib/guides";
import {
  formatItemCount,
  resourceDescription,
  resourceLang,
  resourceLinkLabel,
  resourcesTitle,
  tagLabel,
} from "./_lib/display";

// No mockup: same style as the Library (design/makiety/Biblioteka.dc.html)
const LINK = "text-navy underline underline-offset-[3px] hover:text-navy-strong";
// A link that stands on its own gets a 44px target (project rule 7)
const TARGET = "inline-flex min-h-11 items-center";
// w-full + min-w-0: a select may shrink below its longest option at 320px (WCAG 1.4.10)
const FIELD =
  "min-h-[50px] w-full min-w-0 max-w-full rounded-[10px] border border-field-border bg-white px-3 text-lg";
const FIELD_BOX = "flex min-w-0 flex-[1_1_14rem] flex-col gap-1";
// The filter form jumps to the results; HashFocus then moves focus to their heading
const RESULTS = "results";

async function loadResources(searchParams: PageProps<"/resources">["searchParams"]) {
  // Empty form fields ("Wszystkie") count as no filter
  const params = Object.fromEntries(
    Object.entries(await searchParams).filter(([, v]) => typeof v === "string" && v !== ""),
  );
  const filters = ResourceFilters.safeParse(params).data ?? {};
  const resources = await getResources();
  return { filters, resources, list: filterResources(resources, filters) };
}

export async function generateMetadata({
  searchParams,
}: PageProps<"/resources">): Promise<Metadata> {
  const { filters, list } = await loadResources(searchParams);
  return {
    title: resourcesTitle(filters, list.length),
    description:
      "Poradniki o innowacjach społecznych, słowniczek oraz raporty i publikacje ROPS w Krakowie.",
  };
}

export default async function ResourcesPage({ searchParams }: PageProps<"/resources">) {
  const { filters, resources, list } = await loadResources(searchParams);
  const { years, tags } = availableValues(resources);

  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
      <HashFocus
        hash={RESULTS}
        targetId={RESULTS}
        changeKey={`${filters.type ?? ""}|${filters.year ?? ""}|${filters.tag ?? ""}`}
      />
      <section className="border-line border-b bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-11 pb-9 sm:px-10">
          <h1 className="text-[clamp(2rem,5vw,2.75rem)] leading-tight font-bold tracking-tight">
            Wiedza o innowacjach
          </h1>
          <p className="text-ink-muted max-w-[760px]">
            Krótkie poradniki, słowniczek oraz badania i publikacje ROPS w Krakowie. Raporty
            otwierają się na stronie ROPS.
          </p>
          <nav aria-label="Na tej stronie" className="text-base">
            <ul className="m-0 flex list-none flex-wrap items-center gap-x-2 p-0">
              <li>
                <a href="#poradniki" className={`${LINK} ${TARGET}`}>
                  Poradniki
                </a>
              </li>
              <li aria-hidden="true">·</li>
              <li>
                <a href="#slowniczek" className={`${LINK} ${TARGET}`}>
                  Słowniczek
                </a>
              </li>
              <li aria-hidden="true">·</li>
              <li>
                <a href={`#${RESULTS}`} className={`${LINK} ${TARGET}`}>
                  Raporty i publikacje
                </a>
              </li>
            </ul>
          </nav>
          <h2 className="mt-4 text-xl font-bold">Szukaj raportów i publikacji</h2>
          <form
            method="get"
            action={`/resources#${RESULTS}`}
            className="flex flex-wrap items-end gap-4"
            aria-label="Filtry raportów i publikacji"
          >
            <div className={FIELD_BOX}>
              <label htmlFor="type" className="text-ink-muted text-[0.9375rem] font-bold">
                Rodzaj
              </label>
              <select id="type" name="type" defaultValue={filters.type ?? ""} className={FIELD}>
                <option value="">Wszystkie</option>
                <option value="raport">Raporty z badań</option>
                <option value="publikacja">Publikacje o innowacjach</option>
              </select>
            </div>
            <div className={FIELD_BOX}>
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
            <div className={FIELD_BOX}>
              <label htmlFor="tag" className="text-ink-muted text-[0.9375rem] font-bold">
                Temat
              </label>
              <select id="tag" name="tag" defaultValue={filters.tag ?? ""} className={FIELD}>
                <option value="">Wszystkie</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    {tagLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className={buttonVariants()}>
              Pokaż wyniki
            </button>
            <Link href="/resources" className={`inline-flex min-h-[50px] items-center ${LINK}`}>
              Wyczyść filtry
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
                    <Link href={l.href} className={`${LINK} ${TARGET} font-bold`}>
                      {l.label}
                      <span aria-hidden="true">&nbsp;→</span>
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
        aria-labelledby={RESULTS}
        className="mx-auto flex max-w-[1200px] flex-col px-4 pt-8 pb-16 sm:px-10"
      >
        <h2 id={RESULTS} className="border-ink scroll-mt-4 border-b-2 pb-2 text-lg font-bold">
          {formatItemCount(list.length)}
        </h2>
        {list.length === 0 ? (
          <p className="py-8">Nic nie pasuje do tych filtrów. Kliknij „Wyczyść filtry”.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {list.map((r) => (
              <li key={r.id} className="border-line flex flex-col gap-1.5 border-b py-5">
                <h3 className="text-xl leading-snug font-bold">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className={LINK}>
                    <span lang={resourceLang(r)}>{resourceLinkLabel(r, list)}</span>
                    <span className="sr-only"> (otwiera się w nowej karcie)</span>
                  </a>
                </h3>
                {resourceDescription(r.opis) ? <p>{resourceDescription(r.opis)}</p> : null}
                <div className="text-ink-muted flex flex-wrap items-center gap-2 text-[0.9375rem]">
                  <span>
                    {r.typ === "raport" ? "Raport z badań" : "Publikacja"}
                    {r.rok ? ` · ${r.rok}` : ""}
                  </span>
                  {r.tagi.map((t) => (
                    // The link is 44px tall (project rule 7); the pill inside stays compact. Navy
                    // underlined text and a 4.7:1 border make it look like a link (WCAG 1.4.1, 1.4.11).
                    <Link
                      key={t}
                      href={`/resources?tag=${encodeURIComponent(t)}#${RESULTS}`}
                      className="inline-flex min-h-11 items-center rounded-full no-underline"
                    >
                      <span className="border-field-border text-navy hover:bg-navy-soft inline-flex min-h-7 items-center rounded-full border bg-white px-2.5 font-bold underline underline-offset-[3px]">
                        <span className="sr-only">Temat: </span>
                        {tagLabel(t)}
                      </span>
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
