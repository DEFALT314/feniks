import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Innowacja } from "@/lib/contracts/zasobnik";
import { pobierzObszary } from "@/app/mapa-wyzwan/_lib/dane";
import { pobierzInnowacje, pobierzInnowacjePoId, pobierzKategorie } from "../_lib/dane";
import { podobneInnowacje, wyzwaniaDlaInnowacji } from "../_lib/powiazania";

// Pełne nazwy programów z etykiet Biblioteki
const PROGRAMY: Record<string, string> = {
  IWS: "Inkubator Włączenia Społecznego",
  MIWS: "Małopolski Inkubator Włączenia Społecznego",
  MIIS: "Małopolski Inkubator Innowacji Społecznych",
  "Inkubator Dostępności": "Inkubator Dostępności",
};

const LINK = "text-[#1F3A8A] underline underline-offset-[3px] hover:text-[#172C6B]";
const FOKUS =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#C2452B]";
const PRZYCISK = `inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[10px] px-[22px] text-[17px] font-bold no-underline ${FOKUS}`;
const ETYKIETA = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-bold";

export async function generateMetadata({
  params,
}: PageProps<"/biblioteka/[id]">): Promise<Metadata> {
  const i = await pobierzInnowacjePoId((await params).id);
  return {
    title: i
      ? `${i.nazwa} – Biblioteka innowacji – HubMI.pl`
      : "Nie ma takiej innowacji – HubMI.pl",
    description: i?.opis_krotki ?? undefined,
  };
}

export default async function Strona({ params }: PageProps<"/biblioteka/[id]">) {
  const { id } = await params;
  const [i, katalog, kategorie, obszary] = await Promise.all([
    pobierzInnowacjePoId(id),
    pobierzInnowacje(),
    pobierzKategorie(),
    pobierzObszary(),
  ]);
  if (!i || !i.opublikowana) notFound();

  const kategoria = kategorie.find((k) => k.id === i.kategoria_id);
  const program = i.program ?? (i.etykieta ? (PROGRAMY[i.etykieta] ?? i.etykieta) : null);
  const podobne = podobneInnowacje(i, katalog);
  const wyzwania = wyzwaniaDlaInnowacji(i, obszary);

  return (
    <main id="tresc" className="bg-[#F6F7F9] text-lg leading-relaxed text-[#151A23]">
      <div className="border-b border-[#D9DDE4] bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-4 pt-5 pb-9 sm:px-10">
          <nav aria-label="Ścieżka" className="text-base">
            <ol className="flex flex-wrap gap-1">
              <li>
                <Link href="/biblioteka" className={LINK}>
                  Biblioteka
                </Link>{" "}
                ›
              </li>
              {kategoria ? (
                <li>
                  <Link href={`/biblioteka?kategoria=${kategoria.id}`} className={LINK}>
                    {kategoria.nazwa}
                  </Link>{" "}
                  ›
                </li>
              ) : null}
              <li aria-current="page" className="text-[#4B5565]">
                {i.nazwa}
              </li>
            </ol>
          </nav>
          <h1 className="max-w-[900px] text-[clamp(2rem,5vw,2.75rem)] leading-tight font-bold tracking-tight">
            {i.nazwa}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {i.sprawdzona_przez_rops ? (
              <span className={`${ETYKIETA} bg-[#E3F2EA] text-[#1D6B48]`}>
                Wybrana do upowszechniania
              </span>
            ) : null}
            {i.opis_niepelny ? (
              <span className={`${ETYKIETA} bg-[#FFF1DB] text-[#8A4B00]`}>Opis niepełny</span>
            ) : null}
            {program ? <span className="text-base text-[#4B5565]">{program}</span> : null}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-12 px-4 pt-4 pb-16 sm:px-10">
        <article className="flex min-w-0 flex-[999_1_560px] flex-col">
          {i.opis_niepelny ? (
            <Blok tytul="Co wiemy" pierwszy>
              <p>
                Znamy nazwę, program i autora tej innowacji. Opis poniżej wynika tylko z tytułu.
                Pełny opis uzupełni ROPS.
              </p>
            </Blok>
          ) : null}
          {i.opis_krotki ? (
            <Blok tytul="Na czym polega" pierwszy={!i.opis_niepelny}>
              <p>{i.opis_krotki}</p>
            </Blok>
          ) : null}
          {i.problem ? (
            <Blok tytul="Jaki problem rozwiązuje">
              <p>{i.problem}</p>
            </Blok>
          ) : null}
          <Lista tytul="Dla kogo" elementy={i.dla_kogo} />
          <Lista tytul="Kto może wdrożyć" elementy={i.kto_moze_wdrozyc} />
          <Blok tytul="Czy to działa">
            <p>{i.czy_dziala ?? "Test jeszcze trwa albo źródła nie podają wyników."}</p>
          </Blok>
          {wyzwania.length > 0 ? (
            <Blok tytul="Wyzwania z Mapy Wyzwań">
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {wyzwania.map(({ obszar, wyzwanie }) => (
                  <li key={wyzwanie.id}>
                    <Link href={`/mapa-wyzwan#${obszar.id}`} className={LINK}>
                      {obszar.nazwa}: {wyzwanie.tekst}
                    </Link>
                  </li>
                ))}
              </ul>
            </Blok>
          ) : null}
          {i.zrodlo ? (
            <p className="pt-4 text-base text-[#4B5565]">Źródło opisu: {i.zrodlo}</p>
          ) : null}
        </article>

        <aside
          aria-label="Materiały i działania"
          className="flex max-w-[380px] flex-[1_1_320px] flex-col gap-5 pt-6"
        >
          <div className="flex flex-col gap-3 rounded-xl border border-t-4 border-[#D9DDE4] border-t-[#1F3A8A] bg-white p-6">
            <h2 className="text-[19px] font-bold">Chcesz to wdrożyć?</h2>
            <Link
              href={`/moje/middleman?innowacja=${encodeURIComponent(i.id)}`}
              className={`${PRZYCISK} bg-[#1F3A8A] text-white hover:bg-[#172C6B]`}
            >
              Przygotuj kartę usługi
            </Link>
            <Link
              href={`/moje/wiadomosci?innowacja=${encodeURIComponent(i.id)}`}
              className={`${PRZYCISK} border border-[#1F3A8A] bg-white text-[#1F3A8A]`}
            >
              Zapytaj ROPS
            </Link>
          </div>
          <Materialy innowacja={i} />
          {podobne.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <h2 className="text-[17px] font-bold">Podobne innowacje</h2>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {podobne.map((p) => (
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

function Blok({
  tytul,
  pierwszy,
  children,
}: {
  tytul: string;
  pierwszy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col gap-2 py-6 ${pierwszy ? "" : "border-t border-[#D9DDE4]"}`}>
      <h2 className="text-[22px] font-bold tracking-tight">{tytul}</h2>
      {children}
    </section>
  );
}

function Lista({ tytul, elementy }: { tytul: string; elementy: string[] }) {
  if (elementy.length === 0) return null;
  return (
    <Blok tytul={tytul}>
      <ul className="m-0 list-disc pl-[22px]">
        {elementy.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </Blok>
  );
}

function Materialy({ innowacja: i }: { innowacja: Innowacja }) {
  const pliki = [
    { nazwa: "Opis modelu", rodzaj: "PDF", url: i.materialy.opis_pdf },
    { nazwa: "Film o innowacji", rodzaj: "YouTube", url: i.materialy.film },
    { nazwa: "Pakiet materiałów", rodzaj: "ZIP", url: i.materialy.pakiet_zip },
    { nazwa: "Zasady wykorzystania", rodzaj: "PDF", url: i.materialy.zasady_wykorzystania },
    ...i.materialy.inne.map((url, n) => ({
      nazwa: `Materiał dodatkowy ${n + 1}`,
      rodzaj: "plik",
      url,
    })),
  ].filter((p): p is { nazwa: string; rodzaj: string; url: string } => Boolean(p.url));

  return (
    <div className="rounded-xl border border-[#D9DDE4] bg-white px-6 pt-2 pb-5">
      <h2 className="sr-only">Materiały</h2>
      {pliki.length > 0 ? (
        <ul className="m-0 list-none p-0">
          {pliki.map((p) => (
            <li key={p.url}>
              <a
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex min-h-12 items-center justify-between gap-3 border-b border-[#D9DDE4] py-3 text-[#1F3A8A] no-underline hover:underline ${FOKUS}`}
              >
                <span>
                  {p.nazwa}
                  <span className="sr-only"> (otwiera się w nowej karcie)</span>
                </span>
                <span className="text-[15px] text-[#4B5565]">{p.rodzaj}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-3 text-[#4B5565]">Brak materiałów do pobrania.</p>
      )}
      <p className="pt-3 text-base">
        <a href={i.url} target="_blank" rel="noopener noreferrer" className={`${LINK} ${FOKUS}`}>
          {i.spoza_biblioteki ? "Źródło na stronie programu ↗" : "Pełna karta na stronie ROPS ↗"}
          <span className="sr-only"> (otwiera się w nowej karcie)</span>
        </a>
      </p>
    </div>
  );
}
