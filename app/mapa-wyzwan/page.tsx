import type { Metadata } from "next";
import Link from "next/link";
import { pobierzKategorie } from "@/app/biblioteka/_lib/dane";
import { pobierzObszary } from "./_lib/dane";
import type { ObszarPelny } from "./_lib/z-plikow";

export const metadata: Metadata = {
  title: "Mapa wyzwań społecznych – HubMI.pl",
  description: "8 obszarów i 48 kluczowych wyzwań społecznych Małopolski według ROPS w Krakowie.",
};

const FOKUS =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#C2452B]";
const LINK = `text-[#1F3A8A] underline underline-offset-[3px] hover:text-[#172C6B] ${FOKUS}`;

function liczbaWyzwan(n: number): string {
  if (n === 1) return "1 wyzwanie";
  const r10 = n % 10;
  const r100 = n % 100;
  return r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14) ? `${n} wyzwania` : `${n} wyzwań`;
}

// Link do Biblioteki: kategorie powiązane z obszarem + słowa z wyzwania
function adresInnowacji(obszar: ObszarPelny, tekst: string): string {
  const p = new URLSearchParams({ q: tekst });
  for (const k of obszar.kategorie_biblioteki) p.append("kategoria", k);
  return `/biblioteka?${p.toString()}`;
}

export default async function Strona({ searchParams }: PageProps<"/mapa-wyzwan">) {
  const { obszar: wybranyId } = await searchParams;
  const [obszary, kategorie] = await Promise.all([pobierzObszary(), pobierzKategorie()]);
  const wybrany = obszary.find((o) => o.id === wybranyId) ?? obszary[0];
  const nazwaKategorii = (id: string) => kategorie.find((k) => k.id === id)?.nazwa ?? id;
  const lacznieWyzwan = obszary.reduce((s, o) => s + o.wyzwania.length, 0);

  return (
    <main id="tresc" className="bg-[#F6F7F9] text-lg leading-relaxed text-[#151A23]">
      <section className="border-b border-[#D9DDE4] bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-11 pb-10 sm:px-10">
          <h1 className="text-[clamp(2rem,5vw,2.75rem)] leading-tight font-bold tracking-tight">
            Mapa wyzwań społecznych
          </h1>
          <p className="max-w-[820px] text-[#4B5565]">
            {obszary.length} obszarów i {lacznieWyzwan} wyzwań opisanych przez Dział Innowacji
            Społecznych ROPS. Każdy problem zgłoszony w HubMI przypisujemy do obszaru i wyzwania,
            żeby było widać, czego najbardziej potrzebuje region.
          </p>
          <nav aria-label="Obszary" className="mt-2">
            <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-4">
              {obszary.map((o) => {
                const aktywny = o.id === wybrany.id;
                return (
                  <li key={o.id}>
                    <Link
                      href={`/mapa-wyzwan?obszar=${o.id}#obszar`}
                      aria-current={aktywny ? "true" : undefined}
                      className={`flex min-h-[84px] flex-col gap-0.5 rounded-[10px] px-[18px] py-4 text-[#151A23] no-underline hover:border-[#1F3A8A] ${FOKUS} ${
                        aktywny
                          ? "border-2 border-[#1F3A8A] bg-[#E8EDFA]"
                          : "border border-[#D9DDE4] bg-white"
                      }`}
                    >
                      <strong>{o.nazwa}</strong>
                      <span
                        className={`text-[15px] ${aktywny ? "text-[#1F3A8A]" : "text-[#4B5565]"}`}
                      >
                        {liczbaWyzwan(o.wyzwania.length)}
                        {aktywny ? " · wybrany" : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-12 px-4 py-10 sm:px-10">
        <section
          id="obszar"
          aria-labelledby="obszar-tytul"
          className="flex min-w-0 flex-[999_1_560px] scroll-mt-4 flex-col gap-3"
        >
          <h2 id="obszar-tytul" className="text-[34px] leading-tight font-bold tracking-tight">
            {wybrany.nazwa}
          </h2>
          {wybrany.definicja ? <p>{wybrany.definicja}</p> : null}

          <h3 className="mt-3 text-[15px] font-bold text-[#4B5565]">Kluczowe wyzwania</h3>
          <ul className="m-0 list-none p-0">
            {wybrany.wyzwania.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[#D9DDE4] py-3.5"
              >
                <span>{w.tekst}</span>
                <Link href={adresInnowacji(wybrany, w.tekst)} className={LINK}>
                  Innowacje<span className="sr-only"> dla wyzwania: {w.tekst}</span>
                </Link>
              </li>
            ))}
          </ul>

          {wybrany.dane.length > 0 ? (
            <>
              <h3 className="mt-6 text-[15px] font-bold text-[#4B5565]">Co mówią dane</h3>
              <ul className="m-0 list-disc pl-[22px]">
                {wybrany.dane.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </>
          ) : null}
          {wybrany.zrodlo_url ? (
            <p className="mt-4 text-base">
              <a
                href={wybrany.zrodlo_url}
                target="_blank"
                rel="noopener noreferrer"
                className={LINK}
              >
                Mapa Wyzwań Społecznych ROPS (PDF) ↗
                <span className="sr-only"> (otwiera się w nowej karcie)</span>
              </a>
            </p>
          ) : null}
        </section>

        <div className="flex max-w-[380px] flex-[1_1_300px] flex-col gap-5 self-start">
          {wybrany.persony.map((p) => (
            <aside
              key={p.id}
              aria-labelledby={`${p.id}-imie`}
              className="flex flex-col gap-2.5 rounded-xl border border-[#D9DDE4] bg-white p-6"
            >
              <span className="text-[15px] font-bold text-[#4B5565]">
                Persona z Mapy Wyzwań (fikcyjna)
              </span>
              <h3 id={`${p.id}-imie`} className="text-[26px] leading-tight font-bold">
                {p.imie}
              </h3>
              {p.opis ? <p>{p.opis}</p> : null}
              {p.cele.length ? (
                <p>
                  <strong>Cele:</strong> {p.cele.join(", ")}.
                </p>
              ) : null}
              {p.wyzwania.length ? (
                <p>
                  <strong>Wyzwania:</strong> {p.wyzwania.join(", ")}.
                </p>
              ) : null}
              <Link
                href={`/dopasuj?opis=${encodeURIComponent(p.opis ?? "")}`}
                className={`mt-1.5 inline-flex min-h-[50px] items-center justify-center rounded-[10px] border border-[#1F3A8A] bg-white px-[22px] text-[17px] font-bold text-[#1F3A8A] no-underline ${FOKUS}`}
              >
                Dopasuj dla: {p.imie}
              </Link>
            </aside>
          ))}
        </div>
      </div>

      <section
        aria-labelledby="tabela"
        className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 pb-16 sm:px-10"
      >
        <h2 id="tabela" className="text-2xl font-bold tracking-tight">
          Cała mapa w tabeli
        </h2>
        <div
          className="overflow-x-auto rounded-xl border border-[#D9DDE4] bg-white"
          tabIndex={0}
          role="region"
          aria-labelledby="tabela"
        >
          <table className="w-full border-collapse text-left text-[17px]">
            <thead>
              <tr className="border-b-2 border-[#151A23]">
                <th scope="col" className="px-4 py-3">
                  Obszar
                </th>
                <th scope="col" className="px-4 py-3">
                  Wyzwań
                </th>
                <th scope="col" className="px-4 py-3">
                  Persona
                </th>
                <th scope="col" className="px-4 py-3">
                  Kategoria Biblioteki
                </th>
              </tr>
            </thead>
            <tbody>
              {obszary.map((o) => (
                <tr key={o.id} className="border-b border-[#D9DDE4] last:border-b-0">
                  <th scope="row" className="px-4 py-3 font-normal">
                    <Link href={`/mapa-wyzwan?obszar=${o.id}#obszar`} className={LINK}>
                      {o.nazwa}
                    </Link>
                  </th>
                  <td className="px-4 py-3">{o.wyzwania.length}</td>
                  <td className="px-4 py-3">{o.persony.map((p) => p.imie).join(", ")}</td>
                  <td className="px-4 py-3">
                    {o.kategorie_biblioteki.map(nazwaKategorii).join("; ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
