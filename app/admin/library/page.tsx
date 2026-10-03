import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getCategories, getInnovations } from "@/app/library/_lib/data";
import { queryStems, score } from "@/app/library/_lib/search";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "../_components/admin-nav";

export const metadata: Metadata = { title: "Biblioteka – Panel ROPS" };

type AuditRow = { id: number; akcja: string; obiekt: string; created_at: string };

// Last card edits from audit_log (readable only by ROPS roles under RLS)
async function recentEdits(): Promise<AuditRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, akcja, obiekt, created_at")
    .like("akcja", "innowacja.%")
    .order("created_at", { ascending: false })
    .limit(8);
  return (data as AuditRow[] | null) ?? [];
}

const time = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short" });

export default async function Page({ searchParams }: PageProps<"/admin/library">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const [innovations, categories, edits] = await Promise.all([
    getInnovations(),
    getCategories(),
    recentEdits(),
  ]);
  const stems = queryStems(query);
  const list = innovations
    .filter((i) => score(i, stems) !== null)
    .sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"));
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.nazwa ?? id;
  const nameById = new Map(innovations.map((i) => [i.id, i.nazwa]));

  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
      <AdminNav current="/admin/library" />
      <div className="mx-auto flex max-w-[1200px] flex-wrap gap-10 px-4 py-8 sm:px-10">
        <section aria-labelledby="karty" className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <h1 id="karty" className="text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-tight">
            Karty innowacji
          </h1>
          <p className="text-muted-foreground">
            Popraw opis, materiały albo widoczność karty bez programisty. Zmiana jest widoczna w
            Bibliotece od razu.
          </p>
          <form method="get" className="flex flex-wrap gap-3" role="search">
            <label htmlFor="szukaj" className="sr-only">
              Szukaj karty
            </label>
            <input
              id="szukaj"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Nazwa albo słowo kluczowe"
              className="border-input focus:border-navy min-h-[50px] flex-[1_1_280px] rounded-[10px] border bg-white px-3.5 text-lg"
            />
            <button
              type="submit"
              className="bg-navy hover:bg-navy-strong min-h-[50px] rounded-[10px] px-[22px] text-[1.0625rem] font-bold text-white"
            >
              Szukaj
            </button>
          </form>
          <p aria-live="polite" className="m-0 text-base font-bold">
            {list.length} {list.length === 1 ? "karta" : "kart"}
          </p>
          <div className="border-border overflow-x-auto rounded-xl border bg-white">
            <table className="w-full border-collapse text-left text-[1.0625rem]">
              <caption className="sr-only">Karty innowacji w Bibliotece</caption>
              <thead>
                <tr className="border-ink border-b-2">
                  <th scope="col" className="px-4 py-3">
                    Innowacja
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Kategoria
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Stan
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) => (
                  <tr key={i.id} className="border-border border-b last:border-b-0">
                    <th scope="row" className="px-4 py-3 font-normal">
                      <Link
                        href={`/admin/library/${i.id}`}
                        className="text-navy underline underline-offset-[3px]"
                      >
                        {i.nazwa}
                        <span className="sr-only"> – edytuj</span>
                      </Link>
                    </th>
                    <td className="px-4 py-3">{categoryName(i.kategoria_id)}</td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1.5">
                        {i.opublikowana ? null : <Badge variant="danger">Ukryta</Badge>}
                        {i.sprawdzona_przez_rops ? (
                          <Badge variant="success">Sprawdzona</Badge>
                        ) : null}
                        {i.opis_niepelny ? <Badge variant="warning">Opis niepełny</Badge> : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside
          aria-labelledby="dziennik"
          className="flex max-w-[360px] flex-[1_1_280px] flex-col gap-3"
        >
          <h2 id="dziennik" className="text-xl font-bold">
            Dziennik zmian
          </h2>
          {edits.length === 0 ? (
            <p className="text-muted-foreground text-base">Brak edycji kart.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-base">
              {edits.map((e) => {
                const id = e.obiekt.replace(/^innovations:/, "");
                return (
                  <li key={e.id}>
                    <span className="text-muted-foreground">
                      {time.format(new Date(e.created_at))}
                    </span>{" "}
                    edycja karty:{" "}
                    <Link
                      href={`/admin/library/${id}`}
                      className="text-navy underline underline-offset-[3px]"
                    >
                      {nameById.get(id) ?? id}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}
