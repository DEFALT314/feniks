import type { Metadata } from "next";
import Link from "next/link";
import { getChallengeAreas } from "@/app/challenge-map/_lib/data";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "../_components/admin-nav";
import { AnnounceOnChange } from "@/components/ui/param-focus";
import { plural } from "../_lib/format";
import {
  aggregateTrends,
  chartLabel,
  parsePeriod,
  PERIODS,
  type IdeaRow,
  type QueryRow,
} from "./_lib/aggregate";

export const metadata: Metadata = { title: "Potrzeby w regionie – Panel ROPS – HubMI.pl" };

// Match queries (P3) and ideas sent to ROPS (P2); both are readable only by ROPS roles under RLS
async function loadRows(days: number): Promise<{ queries: QueryRow[]; ideas: IdeaRow[] }> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const supabase = await createClient();
  const [queries, ideas] = await Promise.all([
    supabase
      .from("match_queries")
      .select("area_id, challenge_id, match_quality")
      .gte("created_at", since),
    supabase
      .from("ideas")
      .select("obszar_id")
      .not("wyslany_at", "is", null)
      .gte("wyslany_at", since),
  ]);
  return {
    queries: (queries.data as QueryRow[] | null) ?? [],
    ideas: (ideas.data as IdeaRow[] | null) ?? [],
  };
}

export default async function Page({ searchParams }: PageProps<"/admin/trends">) {
  const days = parsePeriod((await searchParams).days);
  const [areas, rows] = await Promise.all([getChallengeAreas(), loadRows(days)]);
  const trends = aggregateTrends(areas, rows.queries, rows.ideas);
  const max = Math.max(1, ...trends.areas.map((a) => a.total));

  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
      <AdminNav current="/admin/trends" />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-8 sm:px-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-tight">
            Potrzeby w regionie
          </h1>
          <p className="text-muted-foreground max-w-[760px]">
            Problemy opisane w „Mam problem” i pomysły wysłane do ROPS, według obszarów Mapy Wyzwań.
            Bez treści zgłoszeń i bez danych osobowych.
          </p>
          <nav aria-label="Okres" className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/admin/trends?days=${p}`}
                aria-current={p === days ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-[10px] border px-4 text-base font-bold no-underline ${
                  p === days ? "border-navy bg-navy text-white" : "border-border text-navy bg-white"
                }`}
              >
                Ostatnie {p} dni
              </Link>
            ))}
          </nav>
          <AnnounceOnChange
            changeKey={String(days)}
            message={`Ostatnie ${days} dni: ${trends.total} ${plural(trends.total, "zgłoszenie", "zgłoszenia", "zgłoszeń")}`}
          />
        </div>

        <section
          aria-labelledby="wykres"
          className="border-border flex flex-col gap-4 rounded-xl border bg-white p-6"
        >
          <h2 id="wykres" className="text-[1.375rem] font-bold">
            Zgłoszenia według obszarów, ostatnie {days} dni: {trends.total}
          </h2>
          <div role="img" aria-label={chartLabel(trends.areas)} className="flex flex-col gap-2">
            {trends.areas.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-[minmax(8rem,14rem)_1fr_3rem] items-center gap-3"
              >
                <span className="text-base">{a.name}</span>
                <span className="bg-neutral-soft h-6 overflow-hidden rounded-md border border-transparent forced-colors:border-[CanvasText]">
                  <span
                    className="bg-navy block h-full rounded-md forced-colors:bg-[CanvasText]"
                    style={{ width: `${(a.total / max) * 100}%` }}
                  />
                </span>
                <span className="text-right font-bold">{a.total}</span>
              </div>
            ))}
          </div>
          <a href="#tabela" className="text-navy text-base underline underline-offset-[3px]">
            Pokaż dane w tabeli
          </a>
        </section>

        <section aria-labelledby="tabela" className="flex flex-col gap-3">
          <h2 id="tabela" className="text-[1.375rem] font-bold">
            Dane w tabeli
          </h2>
          <div className="border-border overflow-x-auto rounded-xl border bg-white">
            <table className="w-full border-collapse text-left text-[1.0625rem]">
              <thead>
                <tr className="border-ink border-b-2">
                  <th scope="col" className="px-4 py-3">
                    Obszar
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Opisane problemy
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Bez dobrego dopasowania
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Pomysły
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Razem
                  </th>
                </tr>
              </thead>
              <tbody>
                {trends.areas.map((a) => (
                  <tr key={a.id} className="border-border border-b last:border-b-0">
                    <th scope="row" className="px-4 py-3 font-normal">
                      <Link
                        href={`/challenge-map?area=${a.id}#area`}
                        className="text-navy underline underline-offset-[3px]"
                      >
                        {a.name}
                      </Link>
                    </th>
                    <td className="px-4 py-3">{a.queries}</td>
                    <td className="px-4 py-3">{a.weak}</td>
                    <td className="px-4 py-3">{a.ideas}</td>
                    <td className="px-4 py-3 font-bold">{a.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground text-base">
            „Bez dobrego dopasowania” to problemy, na które Biblioteka nie ma jeszcze rozwiązania.
            Warto o nich pomyśleć przy kolejnym naborze.
            {trends.unassigned > 0 ? ` Bez przypisanego obszaru: ${trends.unassigned}.` : ""}
          </p>
        </section>

        <section aria-labelledby="wyzwania" className="flex flex-col gap-3">
          <h2 id="wyzwania" className="text-[1.375rem] font-bold">
            Najczęstsze wyzwania
          </h2>
          {trends.challenges.length === 0 ? (
            <p className="text-muted-foreground">Brak dopasowań w tym okresie.</p>
          ) : (
            <ol className="m-0 flex flex-col gap-2 pl-6">
              {trends.challenges.map((c) => (
                <li key={c.id}>
                  <strong>{c.text}</strong>{" "}
                  <span className="text-muted-foreground text-base">
                    ({c.areaName}, {c.count})
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
