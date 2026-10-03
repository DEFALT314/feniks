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

// Colors and layout per design/makiety/Biblioteka.dc.html; switch to theme classes once P2 adds the tokens
const BUTTON =
  "inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[10px] px-[22px] text-[17px] font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#C2452B]";
const BADGE = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold";

export default async function LibraryPage({ searchParams }: PageProps<"/biblioteka">) {
  const params = await searchParams;
  const filters = LibraryFilters.safeParse(params).data ?? LibraryFilters.parse({});
  const [innovations, available] = await Promise.all([getInnovations(), getAvailableFilters()]);
  const list = search(innovations, filters, available);

  const selectedCategories = available.kategorie.filter((k) => filters.kategoria.includes(k.id));
  const heading = [
    selectedCategories.length ? selectedCategories.map((k) => k.nazwa).join(", ") : null,
    filters.q ? `„${filters.q}”` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main id="tresc" className="bg-[#F6F7F9] text-lg leading-relaxed text-[#151A23]">
      <FilterForm id="filtry" aria-label="Szukaj i filtruj innowacje">
        <section className="border-b border-[#D9DDE4] bg-white">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-11 pb-9 sm:px-10">
            <h1 className="text-[clamp(2rem,5vw,2.75rem)] leading-tight font-bold tracking-tight">
              Biblioteka innowacji
            </h1>
            <p className="max-w-[760px] text-[#4B5565]">
              Rozwiązania przetestowane w inkubatorach ROPS. Każda karta mówi, dla kogo jest
              rozwiązanie, kto może je wdrożyć i jakie są materiały.
            </p>
            <div className="flex max-w-[900px] flex-wrap items-center gap-3">
              <label htmlFor="szukaj" className="sr-only">
                Szukaj w Bibliotece
              </label>
              <input
                id="szukaj"
                name="q"
                type="search"
                defaultValue={filters.q ?? ""}
                placeholder="np. samotność seniorów"
                className="min-h-[50px] flex-[1_1_320px] rounded-[10px] border border-[#6B7487] bg-white px-3.5 py-3 text-lg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#C2452B]"
              />
              <button
                type="submit"
                className={`${BUTTON} bg-[#1F3A8A] text-white hover:bg-[#172C6B]`}
              >
                Szukaj
              </button>
            </div>
            <p className="text-base">
              Nie wiesz, czego szukać?{" "}
              <Link href="/dopasuj" className="text-[#1F3A8A] underline underline-offset-[3px]">
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
                  name="kategoria"
                  value={k.id}
                  checked={filters.kategoria.includes(k.id)}
                  count={list.liczniki.kategorie[k.id] ?? 0}
                >
                  {k.nazwa}
                </FilterOption>
              ))}
            </FilterGroup>
            <FilterGroup legend="Sprawdzenie">
              <FilterOption
                name="sprawdzona"
                value="1"
                checked={filters.sprawdzona}
                count={list.liczniki.sprawdzona}
              >
                Wybrane do upowszechniania
              </FilterOption>
            </FilterGroup>
            <FilterGroup legend="Materiały">
              <FilterOption name="film" value="1" checked={filters.film} count={list.liczniki.film}>
                Jest film
              </FilterOption>
              <FilterOption name="pdf" value="1" checked={filters.pdf} count={list.liczniki.pdf}>
                Jest opis modelu (PDF)
              </FilterOption>
            </FilterGroup>
            {filters.grupa ? <input type="hidden" name="grupa" value={filters.grupa} /> : null}
            {filters.etykieta ? (
              <input type="hidden" name="etykieta" value={filters.etykieta} />
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className={`${BUTTON} border border-[#1F3A8A] bg-white text-[#1F3A8A]`}
              >
                Pokaż wyniki
              </button>
              <Link
                href="/biblioteka"
                className="inline-flex min-h-[50px] items-center text-[#1F3A8A] underline"
              >
                Wyczyść filtry
              </Link>
            </div>
          </aside>

          <section aria-labelledby="wyniki" className="flex min-w-0 flex-[999_1_560px] flex-col">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-[#151A23] pb-2">
              <h2 id="wyniki" aria-live="polite" className="text-lg font-bold">
                {heading ? `${heading}: ` : ""}
                {formatResultCount(list.liczba)}
              </h2>
              <span className="text-base text-[#4B5565]">
                Sortowanie: {filters.q ? "najlepiej pasujące" : "najpierw sprawdzone przez ROPS"}
              </span>
            </div>

            {list.wyniki.length === 0 ? (
              <div className="flex flex-col gap-3 py-8">
                <p>Nic nie pasuje do tych filtrów.</p>
                <p>
                  Spróbuj innych słów albo{" "}
                  <Link href="/dopasuj" className="text-[#1F3A8A] underline">
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
                    href={libraryUrl(filters, { strona: list.strona - 1 })}
                    className="px-2.5 font-bold text-[#1F3A8A]"
                  >
                    ← Poprzednia strona
                  </Link>
                ) : null}
                {Array.from({ length: list.liczba_stron }, (_, n) => n + 1).map((s) => (
                  <Link
                    key={s}
                    href={libraryUrl(filters, { strona: s })}
                    aria-current={s === list.strona ? "page" : undefined}
                    aria-label={`Strona ${s}`}
                    className={
                      s === list.strona
                        ? "inline-flex h-11 min-w-11 items-center justify-center rounded-[10px] bg-[#1F3A8A] font-bold text-white"
                        : "inline-flex h-11 min-w-11 items-center justify-center rounded-[10px] border border-[#D9DDE4] bg-white text-[#1F3A8A]"
                    }
                  >
                    {s}
                  </Link>
                ))}
                {list.strona < list.liczba_stron ? (
                  <Link
                    href={libraryUrl(filters, { strona: list.strona + 1 })}
                    className="px-2.5 font-bold text-[#1F3A8A]"
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
      <legend className="mb-2 text-[15px] font-bold text-[#4B5565]">{legend}</legend>
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
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[17px]">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="size-5 accent-[#1F3A8A] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#C2452B]"
      />
      <span>{children}</span>
      <span className="ml-auto text-[15px] text-[#4B5565]">
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
    <li className="flex flex-col gap-1.5 border-b border-[#D9DDE4] py-5">
      <h3 className="text-[22px] leading-snug font-bold tracking-tight">
        <Link
          href={`/biblioteka/${i.id}`}
          className="text-[#151A23] no-underline hover:text-[#1F3A8A] hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#C2452B]"
        >
          {i.nazwa}
        </Link>
      </h3>
      {i.opis_niepelny ? (
        <p className="text-[#4B5565]">Znamy nazwę, program i autora. Pełny opis uzupełni ROPS.</p>
      ) : (
        <p>{i.opis_krotki}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {i.sprawdzona_przez_rops ? (
          <span className={`${BADGE} bg-[#E3F2EA] text-[#1D6B48]`}>Wybrana do upowszechniania</span>
        ) : null}
        {i.opis_niepelny ? (
          <span className={`${BADGE} bg-[#FFF1DB] text-[#8A4B00]`}>Opis niepełny</span>
        ) : null}
        {i.spoza_biblioteki ? (
          <span className={`${BADGE} bg-[#EEF0F4] text-[#4B5565]`}>
            Z inkubatora ROPS, spoza Biblioteki online
          </span>
        ) : null}
        {meta ? <span className="text-[15px] text-[#4B5565]">{meta}</span> : null}
      </div>
    </li>
  );
}
