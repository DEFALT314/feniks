import type { Metadata } from "next";
import Link from "next/link";
import { FiltryBiblioteki, type InnowacjaSkrot } from "@/lib/contracts/zasobnik";
import { dostepneFiltry, pobierzInnowacje } from "./_lib/dane";
import { szukaj } from "./_lib/szukaj";
import { adresBiblioteki } from "./_lib/adres";
import { FormularzFiltrow } from "./_components/formularz-filtrow";

export const metadata: Metadata = {
  title: "Biblioteka innowacji – HubMI.pl",
  description: "Rozwiązania społeczne przetestowane w inkubatorach ROPS w Krakowie.",
};

// Kolory i układ według design/makiety/Biblioteka.dc.html; po dodaniu tokenów przez P2 zamienić na klasy motywu
const PRZYCISK =
  "inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[10px] px-[22px] text-[17px] font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#C2452B]";
const ETYKIETA = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold";

export default async function Strona({ searchParams }: PageProps<"/biblioteka">) {
  const parametry = await searchParams;
  const filtry = FiltryBiblioteki.safeParse(parametry).data ?? FiltryBiblioteki.parse({});
  const [innowacje, dostepne] = await Promise.all([pobierzInnowacje(), dostepneFiltry()]);
  const lista = szukaj(innowacje, filtry, dostepne);

  const wybraneKategorie = dostepne.kategorie.filter((k) => filtry.kategoria.includes(k.id));
  const naglowek = [
    wybraneKategorie.length ? wybraneKategorie.map((k) => k.nazwa).join(", ") : null,
    filtry.q ? `„${filtry.q}”` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main id="tresc" className="bg-[#F6F7F9] text-lg leading-relaxed text-[#151A23]">
      <FormularzFiltrow id="filtry" aria-label="Szukaj i filtruj innowacje">
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
                defaultValue={filtry.q ?? ""}
                placeholder="np. samotność seniorów"
                className="min-h-[50px] flex-[1_1_320px] rounded-[10px] border border-[#6B7487] bg-white px-3.5 py-3 text-lg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#C2452B]"
              />
              <button
                type="submit"
                className={`${PRZYCISK} bg-[#1F3A8A] text-white hover:bg-[#172C6B]`}
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
            <Grupa legenda="Kategoria">
              {dostepne.kategorie.map((k) => (
                <Opcja
                  key={k.id}
                  name="kategoria"
                  value={k.id}
                  zaznaczone={filtry.kategoria.includes(k.id)}
                  licznik={lista.liczniki.kategorie[k.id] ?? 0}
                >
                  {k.nazwa}
                </Opcja>
              ))}
            </Grupa>
            <Grupa legenda="Sprawdzenie">
              <Opcja
                name="sprawdzona"
                value="1"
                zaznaczone={filtry.sprawdzona}
                licznik={lista.liczniki.sprawdzona}
              >
                Wybrane do upowszechniania
              </Opcja>
            </Grupa>
            <Grupa legenda="Materiały">
              <Opcja name="film" value="1" zaznaczone={filtry.film} licznik={lista.liczniki.film}>
                Jest film
              </Opcja>
              <Opcja name="pdf" value="1" zaznaczone={filtry.pdf} licznik={lista.liczniki.pdf}>
                Jest opis modelu (PDF)
              </Opcja>
            </Grupa>
            {filtry.grupa ? <input type="hidden" name="grupa" value={filtry.grupa} /> : null}
            {filtry.etykieta ? (
              <input type="hidden" name="etykieta" value={filtry.etykieta} />
            ) : null}
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className={`${PRZYCISK} border border-[#1F3A8A] bg-white text-[#1F3A8A]`}
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
                {naglowek ? `${naglowek}: ` : ""}
                {liczbaWynikow(lista.liczba)}
              </h2>
              <span className="text-base text-[#4B5565]">
                Sortowanie: {filtry.q ? "najlepiej pasujące" : "najpierw sprawdzone przez ROPS"}
              </span>
            </div>

            {lista.wyniki.length === 0 ? (
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
                {lista.wyniki.map((i) => (
                  <Wiersz key={i.id} innowacja={i} />
                ))}
              </ul>
            )}

            {lista.liczba_stron > 1 ? (
              <nav aria-label="Strony wyników" className="flex flex-wrap items-center gap-1.5 pt-6">
                {lista.strona > 1 ? (
                  <Link
                    href={adresBiblioteki(filtry, { strona: lista.strona - 1 })}
                    className="px-2.5 font-bold text-[#1F3A8A]"
                  >
                    ← Poprzednia strona
                  </Link>
                ) : null}
                {Array.from({ length: lista.liczba_stron }, (_, n) => n + 1).map((s) => (
                  <Link
                    key={s}
                    href={adresBiblioteki(filtry, { strona: s })}
                    aria-current={s === lista.strona ? "page" : undefined}
                    aria-label={`Strona ${s}`}
                    className={
                      s === lista.strona
                        ? "inline-flex h-11 min-w-11 items-center justify-center rounded-[10px] bg-[#1F3A8A] font-bold text-white"
                        : "inline-flex h-11 min-w-11 items-center justify-center rounded-[10px] border border-[#D9DDE4] bg-white text-[#1F3A8A]"
                    }
                  >
                    {s}
                  </Link>
                ))}
                {lista.strona < lista.liczba_stron ? (
                  <Link
                    href={adresBiblioteki(filtry, { strona: lista.strona + 1 })}
                    className="px-2.5 font-bold text-[#1F3A8A]"
                  >
                    Następna strona →
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </section>
        </div>
      </FormularzFiltrow>
    </main>
  );
}

function liczbaWynikow(n: number): string {
  if (n === 1) return "1 innowacja";
  const reszta10 = n % 10;
  const reszta100 = n % 100;
  if (reszta10 >= 2 && reszta10 <= 4 && (reszta100 < 12 || reszta100 > 14)) return `${n} innowacje`;
  return `${n} innowacji`;
}

function Grupa({ legenda, children }: { legenda: string; children: React.ReactNode }) {
  return (
    <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
      <legend className="mb-2 text-[15px] font-bold text-[#4B5565]">{legenda}</legend>
      {children}
    </fieldset>
  );
}

function Opcja({
  name,
  value,
  zaznaczone,
  licznik,
  children,
}: {
  name: string;
  value: string;
  zaznaczone: boolean;
  licznik: number;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[17px]">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={zaznaczone}
        className="size-5 accent-[#1F3A8A] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#C2452B]"
      />
      <span>{children}</span>
      <span className="ml-auto text-[15px] text-[#4B5565]">
        {licznik}
        <span className="sr-only"> pozycji</span>
      </span>
    </label>
  );
}

function Wiersz({ innowacja: i }: { innowacja: InnowacjaSkrot }) {
  const kto = i.kto_moze_wdrozyc.slice(0, 2).join(", ");
  const meta = [kto, i.ma_film ? "film" : null, i.ma_pdf ? "PDF" : null]
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
          <span className={`${ETYKIETA} bg-[#E3F2EA] text-[#1D6B48]`}>
            Wybrana do upowszechniania
          </span>
        ) : null}
        {i.opis_niepelny ? (
          <span className={`${ETYKIETA} bg-[#FFF1DB] text-[#8A4B00]`}>Opis niepełny</span>
        ) : null}
        {i.spoza_biblioteki ? (
          <span className={`${ETYKIETA} bg-[#EEF0F4] text-[#4B5565]`}>
            Z inkubatora ROPS, spoza Biblioteki online
          </span>
        ) : null}
        {meta ? <span className="text-[15px] text-[#4B5565]">{meta}</span> : null}
      </div>
    </li>
  );
}
