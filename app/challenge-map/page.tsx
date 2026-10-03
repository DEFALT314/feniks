import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/app/library/_lib/data";
import { getChallengeAreas } from "./_lib/data";
import type { FullChallengeArea } from "./_lib/from-files";
import { challengeMapTitle, formatChallengeCount } from "./_lib/format";
import { HashFocus } from "@/app/library/_components/hash-focus";

export async function generateMetadata({
  searchParams,
}: PageProps<"/challenge-map">): Promise<Metadata> {
  const { area } = await searchParams;
  const picked = (await getChallengeAreas()).find((o) => o.id === area);
  return {
    title: challengeMapTitle(picked?.nazwa ?? null),
    description: "8 obszarów i 48 kluczowych wyzwań społecznych Małopolski według ROPS w Krakowie.",
  };
}

const LINK = "text-navy underline underline-offset-[3px] hover:text-navy-strong";
// A link that stands on its own gets a 44px target (project rule 7)
const TARGET = "inline-flex min-h-11 items-center";

// Link to the Library: categories linked to the area + words from the challenge
function innovationsUrl(area: FullChallengeArea, text: string): string {
  const p = new URLSearchParams({ q: text });
  for (const k of area.kategorie_biblioteki) p.append("category", k);
  return `/library?${p.toString()}`;
}

export default async function ChallengeMapPage({ searchParams }: PageProps<"/challenge-map">) {
  const { area: selectedId } = await searchParams;
  const [areas, categories] = await Promise.all([getChallengeAreas(), getCategories()]);
  const selected = areas.find((o) => o.id === selectedId) ?? areas[0];
  const categoryName = (id: string) => categories.find((k) => k.id === id)?.nazwa ?? id;
  const totalChallenges = areas.reduce((s, o) => s + o.wyzwania.length, 0);

  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
      {/* A picked area jumps to #area: move focus there too, not only the scroll (WCAG 2.4.3) */}
      <HashFocus hash="area" targetId="area-title" changeKey={selected.id} />
      <section className="border-line border-b bg-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 pt-11 pb-10 sm:px-10">
          <h1 className="text-[clamp(2rem,5vw,2.75rem)] leading-tight font-bold tracking-tight">
            Mapa wyzwań społecznych
          </h1>
          <p className="text-ink-muted max-w-[820px]">
            {areas.length} obszarów i {totalChallenges} wyzwań opisał ROPS w Krakowie. Każdy problem
            zgłoszony w HubMI przypisujemy do obszaru. Dzięki temu widać, czego region potrzebuje
            najbardziej.
          </p>
          <nav aria-label="Obszary" className="mt-2">
            <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-4">
              {areas.map((o) => {
                const active = o.id === selected.id;
                return (
                  <li key={o.id}>
                    <Link
                      href={`/challenge-map?area=${o.id}#area`}
                      aria-current={active ? "true" : undefined}
                      className={`text-ink hover:border-navy flex min-h-[84px] flex-col gap-0.5 rounded-[10px] px-[18px] py-4 no-underline ${
                        active ? "border-navy bg-navy-soft border-2" : "border-line border bg-white"
                      }`}
                    >
                      <strong>{o.nazwa}</strong>
                      <span
                        className={`text-[0.9375rem] ${active ? "text-navy" : "text-ink-muted"}`}
                      >
                        {formatChallengeCount(o.wyzwania.length)}
                        {/* aria-current already says it to screen readers */}
                        {active ? <span aria-hidden="true"> · wybrany</span> : null}
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
          id="area"
          aria-labelledby="area-title"
          className="flex min-w-0 flex-[999_1_560px] scroll-mt-4 flex-col gap-3"
        >
          <h2 id="area-title" className="text-[2.125rem] leading-tight font-bold tracking-tight">
            {selected.nazwa}
          </h2>
          {selected.definicja ? <p>{selected.definicja}</p> : null}

          <h3 className="text-ink-muted mt-3 text-[0.9375rem] font-bold">Kluczowe wyzwania</h3>
          <ul className="m-0 list-none p-0">
            {selected.wyzwania.map((w) => (
              <li
                key={w.id}
                className="border-line flex flex-wrap items-baseline justify-between gap-4 border-b py-3.5"
              >
                <span>{w.tekst}</span>
                <Link href={innovationsUrl(selected, w.tekst)} className={`${LINK} ${TARGET}`}>
                  Innowacje<span className="sr-only"> dla wyzwania: {w.tekst}</span>
                </Link>
              </li>
            ))}
          </ul>

          {selected.dane.length > 0 ? (
            <>
              <h3 className="text-ink-muted mt-6 text-[0.9375rem] font-bold">Co mówią dane</h3>
              <ul className="m-0 list-disc pl-[22px]">
                {selected.dane.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </>
          ) : null}
          {selected.zrodlo_url ? (
            <p className="mt-4 text-base">
              <a
                href={selected.zrodlo_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${LINK} ${TARGET}`}
              >
                Mapa Wyzwań Społecznych ROPS (PDF)
                <span aria-hidden="true">&nbsp;↗</span>
                <span className="sr-only"> (otwiera się w nowej karcie)</span>
              </a>
            </p>
          ) : null}
        </section>

        <div className="flex max-w-[380px] flex-[1_1_300px] flex-col gap-5 self-start">
          {selected.persony.map((p) => (
            <aside
              key={p.id}
              aria-labelledby={`${p.id}-name`}
              className="border-line flex flex-col gap-2.5 rounded-xl border bg-white p-6"
            >
              <span className="text-ink-muted text-[0.9375rem] font-bold">
                Przykładowa osoba z Mapy Wyzwań (fikcyjna)
              </span>
              <h3 id={`${p.id}-name`} className="text-[1.625rem] leading-tight font-bold">
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
                href={`/match?description=${encodeURIComponent(p.opis ?? "")}`}
                className="border-navy text-navy mt-1.5 inline-flex min-h-[50px] items-center justify-center rounded-[10px] border bg-white px-[22px] text-[1.0625rem] font-bold no-underline"
              >
                Dopasuj dla: {p.imie}
              </Link>
            </aside>
          ))}
        </div>
      </div>

      {/* One region only: the scroll container, named by the heading. The table lists every
          challenge, so it gives the same information as the tiles and panels above (WCAG 1.3.1). */}
      <section className="mx-auto flex max-w-[1200px] flex-col gap-3 px-4 pb-16 sm:px-10">
        <h2 id="challenge-table" className="text-2xl font-bold tracking-tight">
          Cała mapa w tabeli
        </h2>
        <div
          className="border-line overflow-x-auto rounded-xl border bg-white"
          tabIndex={0}
          role="region"
          aria-labelledby="challenge-table"
        >
          <table className="w-full border-collapse text-left text-[1.0625rem]">
            <caption className="sr-only">
              Wszystkie obszary Mapy wyzwań: kluczowe wyzwania, przykładowe osoby i kategorie
              Biblioteki
            </caption>
            <thead>
              <tr className="border-ink border-b-2">
                <th scope="col" className="px-4 py-3">
                  Obszar
                </th>
                <th scope="col" className="min-w-[18rem] px-4 py-3">
                  Kluczowe wyzwania
                </th>
                <th scope="col" className="px-4 py-3">
                  Przykładowe osoby
                </th>
                <th scope="col" className="px-4 py-3">
                  Kategoria Biblioteki
                </th>
              </tr>
            </thead>
            <tbody>
              {areas.map((o) => (
                <tr key={o.id} className="border-line border-b align-top last:border-b-0">
                  <th scope="row" className="px-4 py-3 font-normal">
                    <Link href={`/challenge-map?area=${o.id}#area`} className={`${LINK} ${TARGET}`}>
                      {o.nazwa}
                    </Link>
                    <span className="text-ink-muted block text-[0.9375rem]">
                      {formatChallengeCount(o.wyzwania.length)}
                    </span>
                  </th>
                  <td className="px-4 py-3">
                    <ul className="m-0 list-disc pl-5 text-base">
                      {o.wyzwania.map((w) => (
                        <li key={w.id}>{w.tekst}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3">{o.persony.map((p) => p.imie).join(", ")}</td>
                  <td className="px-4 py-3">
                    {o.kategorie_biblioteki.map(categoryName).join("; ")}
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
