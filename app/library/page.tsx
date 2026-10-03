import type { Metadata } from "next";
import Link from "next/link";
import { LibraryFilters, type InnovationSummary } from "@/lib/contracts/knowledge-base";
import { getAvailableFilters, getInnovations } from "./_lib/data";
import { search } from "./_lib/search";
import { libraryUrl } from "./_lib/url-params";
import { FilterForm } from "./_components/filter-form";

export const metadata: Metadata = {
  title: "Biblioteka innowacji – HubMI.pl",
  description: "Rozwiązania społeczne przetestowane w inkubatorach ROPS w Krakowie.",
};

// Colors and layout per design/makiety/Biblioteka.dc.html (theme tokens from app/globals.css)
const BUTTON =
  "inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[10px] px-[22px] text-[1.0625rem] font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brick";
const BADGE = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold";

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const params = await searchParams;
  const filters = LibraryFilters.safeParse(params).data ?? LibraryFilters.parse({});
  const [innovations, available] = await Promise.all([getInnovations(), getAvailableFilters()]);
  const list = search(innovations, filters, available);

  const selectedCategories = available.kategorie.filter((k) => filters.category.includes(k.id));
  const heading = [
    selectedCategories.length ? selectedCategories.map((k) => k.nazwa).join(", ") : null,
    filters.q ? `„${filters.q}”` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
      <FilterForm id="filters" aria-label="Szukaj i filtruj innowacje">
        <section className="border-line border-b bg-white">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-11 pb-9 sm:px-10">
            <h1 className="text-[clamp(2rem,5vw,2.75rem)] leading-tight font-bold tracking-tight">
              Biblioteka innowacji
            </h1>
            <p className="text-ink-muted max-w-[760px]">
              Rozwiązania przetestowane w inkubatorach ROPS. Każda karta mówi, dla kogo jest
              rozwiązanie, kto może je wdrożyć i jakie są materiały.
            </p>
            <div className="flex max-w-[900px] flex-wrap items-center gap-3">
              <label htmlFor="search" className="sr-only">
                Szukaj w Bibliotece
              </label>
              <input
                id="search"
                name="q"
                type="search"
                defaultValue={filters.q ?? ""}
                placeholder="np. samotność seniorów"
                className="border-field-border focus-visible:outline-brick min-h-[50px] flex-[1_1_320px] rounded-[10px] border bg-white px-3.5 py-3 text-lg focus-visible:outline-3 focus-visible:outline-offset-2"
              />
              <button type="submit" className={`${BUTTON} bg-navy hover:bg-navy-strong text-white`}>
                Szukaj
              </button>
            </div>
            <p className="text-base">
              Nie wiesz, czego szukać?{" "}
              <Link href="/match" className="text-navy underline underline-offset-[3px]">
                Opisz problem, a dopasujemy rozwiązanie
              </Link>
              .
            </p>
          </div>
        </section>

        <div className="mx-auto flex max-w-[1200px] flex-wrap gap-10 px-4 pt-8 pb-16 sm:px-10">
          <aside aria-label="Filtry" className="flex max-w-[300px] flex-[1_1_260px] flex-col gap-7">
            <FilterGroup legend="Kategoria">
              {available.kategorie.map((k) => (
                <FilterOption
                  key={k.id}
                  name="category"
                  value={k.id}
                  checked={filters.category.includes(k.id)}
                  count={list.liczniki.kategorie[k.id] ?? 0}
                >
                  {k.nazwa}
                </FilterOption>
              ))}
            </FilterGroup>
            <FilterGroup legend="Sprawdzenie">
              <FilterOption
                name="verified"
                value="1"
                checked={filters.verified}
                count={list.liczniki.sprawdzona}
              >
                Wybrane do upowszechniania
              </FilterOption>
            </FilterGroup>
            <FilterGroup legend="Materiały">
              <FilterOption
                name="video"
                value="1"
                checked={filters.video}
                count={list.liczniki.film}
              >
                Jest film
              </FilterOption>
              <FilterOption name="pdf" value="1" checked={filters.pdf} count={list.liczniki.pdf}>
                Jest opis modelu (PDF)
              </FilterOption>
            </FilterGroup>
            {filters.group ? <input type="hidden" name="group" value={filters.group} /> : null}
            {filters.label ? <input type="hidden" name="label" value={filters.label} /> : null}
            <div className="flex flex-wrap gap-3">
              <button type="submit" className={`${BUTTON} border-navy text-navy border bg-white`}>
                Pokaż wyniki
              </button>
              <Link
                href="/library"
                className="text-navy inline-flex min-h-[50px] items-center underline"
              >
                Wyczyść filtry
              </Link>
            </div>
          </aside>

          <section aria-labelledby="results" className="flex min-w-0 flex-[999_1_560px] flex-col">
            <div className="border-ink flex flex-wrap items-baseline justify-between gap-2 border-b-2 pb-2">
              <h2 id="results" aria-live="polite" className="text-lg font-bold">
                {heading ? `${heading}: ` : ""}
                {formatResultCount(list.liczba)}
              </h2>
              <span className="text-ink-muted text-base">
                Sortowanie: {filters.q ? "najlepiej pasujące" : "najpierw sprawdzone przez ROPS"}
              </span>
            </div>

            {list.wyniki.length === 0 ? (
              <div className="flex flex-col gap-3 py-8">
                <p>Nic nie pasuje do tych filtrów.</p>
                <p>
                  Spróbuj innych słów albo{" "}
                  <Link href="/match" className="text-navy underline">
                    opisz swój problem własnymi słowami
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {list.wyniki.map((i) => (
                  <ResultRow key={i.id} innovation={i} />
                ))}
              </ul>
            )}

            {list.liczba_stron > 1 ? (
              <nav aria-label="Strony wyników" className="flex flex-wrap items-center gap-1.5 pt-6">
                {list.strona > 1 ? (
                  <Link
                    href={libraryUrl(filters, { page: list.strona - 1 })}
                    className="text-navy px-2.5 font-bold"
                  >
                    ← Poprzednia strona
                  </Link>
                ) : null}
                {Array.from({ length: list.liczba_stron }, (_, n) => n + 1).map((s) => (
                  <Link
                    key={s}
                    href={libraryUrl(filters, { page: s })}
                    aria-current={s === list.strona ? "page" : undefined}
                    aria-label={`Strona ${s}`}
                    className={
                      s === list.strona
                        ? "bg-navy inline-flex h-11 min-w-11 items-center justify-center rounded-[10px] font-bold text-white"
                        : "border-line text-navy inline-flex h-11 min-w-11 items-center justify-center rounded-[10px] border bg-white"
                    }
                  >
                    {s}
                  </Link>
                ))}
                {list.strona < list.liczba_stron ? (
                  <Link
                    href={libraryUrl(filters, { page: list.strona + 1 })}
                    className="text-navy px-2.5 font-bold"
                  >
                    Następna strona →
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </section>
        </div>
      </FilterForm>
    </main>
  );
}

// Polish plural forms: 1 innowacja, 2–4 innowacje, 5+ innowacji
function formatResultCount(n: number): string {
  if (n === 1) return "1 innowacja";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} innowacje`;
  return `${n} innowacji`;
}

function FilterGroup({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
      <legend className="text-ink-muted mb-2 text-[0.9375rem] font-bold">{legend}</legend>
      {children}
    </fieldset>
  );
}

function FilterOption({
  name,
  value,
  checked,
  count,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[1.0625rem]">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="accent-navy focus-visible:outline-brick size-5 focus-visible:outline-3 focus-visible:outline-offset-2"
      />
      <span>{children}</span>
      <span className="text-ink-muted ml-auto text-[0.9375rem]">
        {count}
        <span className="sr-only"> pozycji</span>
      </span>
    </label>
  );
}

function ResultRow({ innovation: i }: { innovation: InnovationSummary }) {
  const implementers = i.kto_moze_wdrozyc.slice(0, 2).join(", ");
  const meta = [implementers, i.ma_film ? "film" : null, i.ma_pdf ? "PDF" : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="border-line flex flex-col gap-1.5 border-b py-5">
      <h3 className="text-[1.375rem] leading-snug font-bold tracking-tight">
        <Link
          href={`/library/${i.id}`}
          className="text-ink hover:text-navy focus-visible:outline-brick no-underline hover:underline focus-visible:outline-3 focus-visible:outline-offset-2"
        >
          {i.nazwa}
        </Link>
      </h3>
      {i.opis_niepelny ? (
        <p className="text-ink-muted">Znamy nazwę, program i autora. Pełny opis uzupełni ROPS.</p>
      ) : (
        <p>{i.opis_krotki}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {i.sprawdzona_przez_rops ? (
          <span className={`${BADGE} bg-success-soft text-success`}>
            Wybrana do upowszechniania
          </span>
        ) : null}
        {i.opis_niepelny ? (
          <span className={`${BADGE} bg-warning-soft text-warning`}>Opis niepełny</span>
        ) : null}
        {i.spoza_biblioteki ? (
          <span className={`${BADGE} bg-neutral-soft text-ink-muted`}>
            Z inkubatora ROPS, spoza Biblioteki online
          </span>
        ) : null}
        {meta ? <span className="text-ink-muted text-[0.9375rem]">{meta}</span> : null}
      </div>
    </li>
  );
}
