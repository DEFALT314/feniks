import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { LibraryFilters, type InnovationSummary } from "@/lib/contracts/knowledge-base";
import { createClient } from "@/lib/supabase/server";
import { getAvailableFilters, getInnovations } from "./_lib/data";
import { getGoodPractices } from "./_lib/good-practices";
import { practiceCountLabel } from "./_lib/good-practices-format";
import { search } from "./_lib/search";
import { libraryUrl } from "./_lib/url-params";
import { filterSummary, formatResultCount, libraryTitle, sourceBreakdown } from "./_lib/format";
import { HashFocus } from "./_components/hash-focus";

// Colors and layout per design/makiety/Biblioteka.dc.html (theme tokens from app/globals.css)

const FORM_ID = "filters";
// The form jumps to the results; HashFocus then moves focus to their heading (WCAG 2.4.3)
const RESULTS = "results";
// A link that stands on its own line gets a 44px target (project rule 7)
const TARGET = "inline-flex min-h-11 items-center";

async function loadLibrary(searchParams: PageProps<"/library">["searchParams"]) {
  const params = await searchParams;
  const filters = LibraryFilters.safeParse(params).data ?? LibraryFilters.parse({});
  const [innovations, available] = await Promise.all([getInnovations(), getAvailableFilters()]);
  const list = search(innovations, filters, available);
  return { filters, available, list, summary: filterSummary(filters, available.kategorie) };
}

export async function generateMetadata({ searchParams }: PageProps<"/library">): Promise<Metadata> {
  const { list, summary } = await loadLibrary(searchParams);
  return {
    title: libraryTitle({ summary, count: list.liczba, page: list.strona }),
    description: "Rozwiązania społeczne przetestowane w inkubatorach ROPS w Krakowie.",
  };
}

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const [{ filters, available, list, summary }, practices] = await Promise.all([
    loadLibrary(searchParams),
    createClient().then(getGoodPractices),
  ]);
  const breakdown = sourceBreakdown(list.liczba, list.liczniki.z_biblioteki);
  const pageUrl = (page: number) => `${libraryUrl(filters, { page })}#${RESULTS}`;

  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
      <HashFocus hash={RESULTS} targetId={RESULTS} changeKey={libraryUrl(filters)} />
      <section className="border-line border-b bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-11 pb-9 sm:px-10">
          <h1 className="text-[clamp(2rem,5vw,2.75rem)] leading-tight font-bold tracking-tight">
            Biblioteka innowacji
          </h1>
          <p className="text-ink-muted max-w-[760px]">
            Rozwiązania przetestowane w inkubatorach ROPS. Przy każdym piszemy, dla kogo jest, kto
            może je u siebie uruchomić i jakie ma materiały do obejrzenia lub pobrania.
          </p>
          {/* The form holds only the search box; the filters in the sidebar join it with form="…".
              Nothing is sent until the user presses a button (WCAG 3.2.2). */}
          <form
            id={FORM_ID}
            role="search"
            aria-label="Szukaj w Bibliotece"
            method="get"
            action={`/library#${RESULTS}`}
            className="flex max-w-[900px] flex-wrap items-center gap-3"
          >
            <label htmlFor="search" className="sr-only">
              Szukaj w Bibliotece
            </label>
            <input
              id="search"
              name="q"
              type="search"
              defaultValue={filters.q ?? ""}
              placeholder="np. samotność seniorów"
              className="border-field-border min-h-[50px] min-w-0 flex-[1_1_320px] rounded-[10px] border bg-white px-3.5 py-3 text-lg"
            />
            <button type="submit" className={buttonVariants()}>
              Szukaj
            </button>
          </form>
          <p className="text-base">
            Nie wiesz, czego szukać?{" "}
            <Link href="/match" className="text-navy underline underline-offset-[3px]">
              Opisz problem, a dopasujemy rozwiązanie
            </Link>
            .
          </p>
        </div>
      </section>

      {practices.length > 0 ? <GoodPracticesBand count={practices.length} /> : null}

      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-10 px-4 pt-8 pb-16 sm:px-10">
        <aside aria-label="Filtry" className="flex max-w-[300px] flex-[1_1_260px] flex-col gap-7">
          <p className="text-ink-muted m-0 text-base">Zaznacz filtry i naciśnij „Pokaż wyniki”.</p>
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
          <FilterGroup legend="Polecane">
            <FilterOption
              name="verified"
              value="1"
              checked={filters.verified}
              count={list.liczniki.sprawdzona}
            >
              Sprawdzone przez ROPS
            </FilterOption>
          </FilterGroup>
          <FilterGroup legend="Materiały">
            <FilterOption name="video" value="1" checked={filters.video} count={list.liczniki.film}>
              Jest film
            </FilterOption>
            <FilterOption name="pdf" value="1" checked={filters.pdf} count={list.liczniki.pdf}>
              Jest opis do pobrania (PDF)
            </FilterOption>
          </FilterGroup>
          {filters.group ? (
            <input type="hidden" form={FORM_ID} name="group" value={filters.group} />
          ) : null}
          {filters.label ? (
            <input type="hidden" form={FORM_ID} name="label" value={filters.label} />
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              form={FORM_ID}
              className={buttonVariants({ variant: "secondary" })}
            >
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

        <section aria-labelledby={RESULTS} className="flex min-w-0 flex-[999_1_560px] flex-col">
          <div className="border-ink flex flex-wrap items-baseline justify-between gap-2 border-b-2 pb-2">
            <h2 id={RESULTS} className="scroll-mt-4 text-lg font-bold">
              {summary ? `${summary}: ` : ""}
              {formatResultCount(list.liczba)}
            </h2>
            <span className="text-ink-muted text-base">
              Sortowanie: {filters.q ? "najlepiej pasujące" : "najpierw sprawdzone przez ROPS"}
            </span>
          </div>
          {breakdown ? <p className="text-ink-muted pt-2 text-base">{breakdown}</p> : null}

          {list.wyniki.length === 0 ? (
            <div className="flex flex-col gap-3 py-8">
              <p>Nic nie znaleźliśmy. Odznacz część filtrów albo wpisz inne słowa.</p>
              <p>
                Możesz też{" "}
                <Link href="/match" className="text-navy underline">
                  opisać swój problem własnymi słowami
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
                  href={pageUrl(list.strona - 1)}
                  className={`text-navy ${TARGET} px-2.5 font-bold`}
                >
                  <span aria-hidden="true">←&nbsp;</span>Poprzednia strona
                </Link>
              ) : null}
              {Array.from({ length: list.liczba_stron }, (_, n) => n + 1).map((s) => (
                <Link
                  key={s}
                  href={pageUrl(s)}
                  aria-current={s === list.strona ? "page" : undefined}
                  aria-label={`Strona ${s}`}
                  className={
                    // The current page also has a thicker border, so it stays visible in forced
                    // colors, where the navy fill disappears (WCAG 1.4.11)
                    s === list.strona
                      ? "bg-navy border-navy inline-flex h-11 min-w-11 items-center justify-center rounded-[10px] border-2 font-bold text-white no-underline"
                      : "border-line text-navy inline-flex h-11 min-w-11 items-center justify-center rounded-[10px] border bg-white"
                  }
                >
                  {s}
                </Link>
              ))}
              {list.strona < list.liczba_stron ? (
                <Link
                  href={pageUrl(list.strona + 1)}
                  className={`text-navy ${TARGET} px-2.5 font-bold`}
                >
                  Następna strona<span aria-hidden="true">&nbsp;→</span>
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>
      </div>
    </main>
  );
}

// Entry to the good practices of residents (#104): approved ideas from the Idea creator
function GoodPracticesBand({ count }: { count: number }) {
  return (
    <section aria-labelledby="good-practices-heading" className="border-line border-b bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 py-5 sm:px-10">
        <div className="flex max-w-[760px] flex-col gap-1">
          <h2 id="good-practices-heading" className="text-[1.1875rem] font-bold">
            Dobre praktyki mieszkańców
          </h2>
          <p className="text-ink-muted text-base">
            {practiceCountLabel(count)} z Kreatora pomysłów, sprawdzone i zatwierdzone przez ROPS.
          </p>
        </div>
        <Link href="/library/good-practices" className={buttonVariants({ variant: "secondary" })}>
          Zobacz dobre praktyki
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
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
        form={FORM_ID}
        name={name}
        value={value}
        defaultChecked={checked}
        className="accent-navy size-5 shrink-0"
      />
      <span>{children}</span>
      <span className="text-ink-muted ml-auto text-[0.9375rem]">
        <span aria-hidden="true">{count}</span>
        <span className="sr-only">, {formatResultCount(count)}</span>
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
          className="text-ink hover:text-navy no-underline hover:underline"
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
        {i.sprawdzona_przez_rops ? <Badge variant="success">Sprawdzona przez ROPS</Badge> : null}
        {i.opis_niepelny ? <Badge variant="warning">Opis niepełny</Badge> : null}
        {i.spoza_biblioteki ? (
          <Badge variant="neutral">Z inkubatora ROPS, spoza listy na stronie ROPS</Badge>
        ) : null}
        {meta ? <span className="text-ink-muted text-[0.9375rem]">{meta}</span> : null}
      </div>
    </li>
  );
}
