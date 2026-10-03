import type { Metadata } from "next";
import Link from "next/link";
import { FiltryZasobow } from "@/lib/contracts/zasobnik";
import { pobierzZasoby } from "./_lib/dane";
import { dostepneWartosci, filtrujZasoby } from "./_lib/filtruj";

export const metadata: Metadata = {
  title: "Raporty i publikacje – HubMI.pl",
  description: "Raporty z badań ROPS w Krakowie i publikacje o innowacjach społecznych.",
};

// Bez makiety: styl jak w Bibliotece (design/makiety/Biblioteka.dc.html)
const FOKUS =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#C2452B]";
const LINK = `text-[#1F3A8A] underline underline-offset-[3px] hover:text-[#172C6B] ${FOKUS}`;
const POLE = `min-h-[50px] rounded-[10px] border border-[#6B7487] bg-white px-3 text-lg ${FOKUS}`;

function liczbaPozycji(n: number): string {
  if (n === 1) return "1 pozycja";
  const r10 = n % 10;
  const r100 = n % 100;
  return r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14) ? `${n} pozycje` : `${n} pozycji`;
}

export default async function Strona({ searchParams }: PageProps<"/zasoby">) {
  // Puste pola formularza („Wszystkie”) traktujemy jak brak filtra
  const parametry = Object.fromEntries(
    Object.entries(await searchParams).filter(([, v]) => typeof v === "string" && v !== ""),
  );
  const filtry = FiltryZasobow.safeParse(parametry).data ?? {};
  const zasoby = await pobierzZasoby();
  const lista = filtrujZasoby(zasoby, filtry);
  const { lata, tagi } = dostepneWartosci(zasoby);

  return (
    <main id="tresc" className="bg-[#F6F7F9] text-lg leading-relaxed text-[#151A23]">
      <section className="border-b border-[#D9DDE4] bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-11 pb-9 sm:px-10">
          <h1 className="text-[clamp(2rem,5vw,2.75rem)] leading-tight font-bold tracking-tight">
            Raporty i publikacje
          </h1>
          <p className="max-w-[760px] text-[#4B5565]">
            Badania ROPS w Krakowie o potrzebach mieszkańców Małopolski i publikacje o innowacjach
            społecznych. Każda pozycja prowadzi do źródła na stronie ROPS.
          </p>
          <form
            method="get"
            action="/zasoby"
            className="flex flex-wrap items-end gap-4"
            aria-label="Filtry"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="typ" className="text-[15px] font-bold text-[#4B5565]">
                Rodzaj
              </label>
              <select id="typ" name="typ" defaultValue={filtry.typ ?? ""} className={POLE}>
                <option value="">Wszystkie</option>
                <option value="raport">Raporty z badań</option>
                <option value="publikacja">Publikacje o innowacjach</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="rok" className="text-[15px] font-bold text-[#4B5565]">
                Rok
              </label>
              <select
                id="rok"
                name="rok"
                defaultValue={filtry.rok ? String(filtry.rok) : ""}
                className={POLE}
              >
                <option value="">Wszystkie</option>
                {lata.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="tag" className="text-[15px] font-bold text-[#4B5565]">
                Temat
              </label>
              <select id="tag" name="tag" defaultValue={filtry.tag ?? ""} className={POLE}>
                <option value="">Wszystkie</option>
                {tagi.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className={`inline-flex min-h-[50px] items-center rounded-[10px] bg-[#1F3A8A] px-[22px] text-[17px] font-bold text-white hover:bg-[#172C6B] ${FOKUS}`}
            >
              Pokaż
            </button>
            <Link href="/zasoby" className={`inline-flex min-h-[50px] items-center ${LINK}`}>
              Wyczyść
            </Link>
          </form>
        </div>
      </section>

      <section
        aria-labelledby="wyniki"
        className="mx-auto flex max-w-[1200px] flex-col px-4 pt-8 pb-16 sm:px-10"
      >
        <h2
          id="wyniki"
          aria-live="polite"
          className="border-b-2 border-[#151A23] pb-2 text-lg font-bold"
        >
          {liczbaPozycji(lista.length)}
        </h2>
        {lista.length === 0 ? (
          <p className="py-8">Nic nie pasuje do tych filtrów.</p>
        ) : (
          <ul className="m-0 list-none p-0">
            {lista.map((z) => (
              <li key={z.id} className="flex flex-col gap-1.5 border-b border-[#D9DDE4] py-5">
                <h3 className="text-xl leading-snug font-bold">
                  <a href={z.url} target="_blank" rel="noopener noreferrer" className={LINK}>
                    {z.tytul}
                    <span className="sr-only"> (otwiera się w nowej karcie)</span>
                  </a>
                </h3>
                {z.opis ? <p>{z.opis}</p> : null}
                <div className="flex flex-wrap items-center gap-2 text-[15px] text-[#4B5565]">
                  <span>
                    {z.typ === "raport" ? "Raport z badań" : "Publikacja"}
                    {z.rok ? ` · ${z.rok}` : ""}
                  </span>
                  {z.tagi.map((t) => (
                    <Link
                      key={t}
                      href={`/zasoby?tag=${encodeURIComponent(t)}`}
                      className={`inline-flex min-h-6 items-center rounded-full bg-[#EEF0F4] px-2.5 font-bold text-[#4B5565] no-underline hover:underline ${FOKUS}`}
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
