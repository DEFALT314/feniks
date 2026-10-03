import type { Metadata } from "next";
import { Check } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { isDemoMode } from "@/lib/auth/demo-accounts";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_TABS, AdminTabs } from "./_components/admin-tabs";
import { AnnounceOnChange, FocusHeading } from "@/components/ui/param-focus";
import { ReviewForm } from "./_components/review-form";
import { describeAudit, filterSummary, formatSentAt } from "./_lib/format";
import { loadExperts, loadIdeaDetail, loadIdeaQueue, loadRecentAudit } from "./_lib/queue";
import { STATUS_BADGE, STATUS_LABELS, parseStatusFilter } from "./_lib/status";

export const metadata: Metadata = { title: "Nowe pomysły – Panel ROPS – HubMI.pl" };

const FILTERS = [
  { value: "open", label: "Do decyzji" },
  { value: "do_poprawy", label: "Do poprawy" },
  { value: "zatwierdzony", label: "Zatwierdzone" },
  { value: "odrzucony", label: "Odrzucone" },
  { value: "all", label: "Wszystkie" },
] as const;

const STAGE_LABELS: Record<string, string> = {
  pomysl: "pomysł",
  prototyp: "prototyp",
  przetestowane: "przetestowane",
  gotowe: "gotowe",
};

// Module VI, idea queue (#5). Layout per design/makiety/Admin.dc.html. Role checked in layout.tsx.
export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  // Middleman notifications link to /admin?karta=<id> (app/api/ai/middleman/deps.ts).
  if (typeof params.karta === "string")
    redirect(`/admin/cards?card=${encodeURIComponent(params.karta)}`);
  const filter = parseStatusFilter(params.status);
  const selectedId = typeof params.idea === "string" ? params.idea : null;

  const supabase = await createClient();
  const [queue, openQueue, experts, audit] = await Promise.all([
    loadIdeaQueue(supabase, filter),
    loadIdeaQueue(supabase, "open"),
    loadExperts(supabase),
    loadRecentAudit(supabase),
  ]);
  const detailId = selectedId ?? queue[0]?.idea_id ?? null;
  const detail = detailId ? await loadIdeaDetail(supabase, detailId) : null;
  const href = (p: Record<string, string>) =>
    `/admin?${new URLSearchParams({ ...(filter !== "open" ? { status: filter } : {}), ...p })}`;

  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <div className="border-border border-b bg-white">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3.5 px-4 pt-8 sm:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h1 className="font-heading text-[2.5rem] font-bold tracking-tight">Panel ROPS</h1>
            {isDemoMode() ? <Badge variant="warning">Dane demonstracyjne</Badge> : null}
          </div>
          <AdminTabs
            current="/admin"
            tabs={ADMIN_TABS.map((t) =>
              t.href === "/admin" ? { ...t, label: `${t.label} (${openQueue.length})` } : t,
            )}
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap gap-10 px-4 pt-8 pb-16 sm:px-10">
        <section
          aria-labelledby="queue-heading"
          className="flex min-w-0 flex-[999_1_560px] flex-col gap-3"
        >
          <h2 id="queue-heading" className="font-heading text-2xl font-bold">
            Nowe pomysły
          </h2>
          <nav aria-label="Filtr statusu" className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const current = filter === f.value;
              return (
                <Link
                  key={f.value}
                  href={f.value === "open" ? "/admin" : `/admin?status=${f.value}`}
                  aria-current={current ? "page" : undefined}
                  className="border-border aria-[current=page]:border-navy aria-[current=page]:bg-navy-soft aria-[current=page]:text-navy text-ink inline-flex min-h-11 items-center gap-1.5 rounded-full border bg-white px-4 text-base font-bold no-underline aria-[current=page]:underline aria-[current=page]:underline-offset-[3px]"
                >
                  {/* Not colour only (WCAG 1.4.1): the chosen filter has a tick and an underline */}
                  {current ? <Check aria-hidden="true" className="size-4" /> : null}
                  {f.label}
                </Link>
              );
            })}
          </nav>
          <AnnounceOnChange
            changeKey={filter}
            message={filterSummary(
              FILTERS.find((f) => f.value === filter)?.label ??
                STATUS_LABELS[filter as keyof typeof STATUS_LABELS] ??
                "Pomysły",
              queue.length,
            )}
          />
          {queue.length === 0 ? (
            <Card>
              <p>Nie ma tu pomysłów. Nowe pojawią się, gdy autor kliknie „Wyślij do ROPS”.</p>
            </Card>
          ) : (
            <div className="border-border overflow-x-auto rounded-xl border bg-white">
              <table className="w-full min-w-[600px] border-collapse text-base">
                <caption className="sr-only">Pomysły wysłane do ROPS, najnowsze na górze</caption>
                <thead>
                  <tr className="text-muted-foreground text-[0.9375rem]">
                    {["Pomysł", "Autor", "Obszar", "Wysłano", "Status"].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="border-border border-b px-3.5 py-3 text-left"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queue.map((row) => {
                    const selected = row.idea_id === detail?.idea_id;
                    return (
                      <tr key={row.idea_id} className={selected ? "bg-navy-soft/50" : undefined}>
                        <th
                          scope="row"
                          className="border-border border-b px-3.5 py-3 text-left font-normal"
                        >
                          <Link
                            href={href({ idea: row.idea_id })}
                            aria-current={selected ? "true" : undefined}
                            scroll={false}
                          >
                            {selected ? <strong>{row.tytul}</strong> : row.tytul}
                          </Link>
                        </th>
                        <td className="border-border border-b px-3.5 py-3">
                          {row.autor_nazwa ?? "—"}
                        </td>
                        <td className="border-border border-b px-3.5 py-3">
                          {row.obszar_nazwa ?? "—"}
                        </td>
                        <td className="border-border border-b px-3.5 py-3 whitespace-nowrap">
                          {formatSentAt(row.wyslany_at)}
                        </td>
                        <td className="border-border border-b px-3.5 py-3">
                          <Badge variant={STATUS_BADGE[row.status]} className="whitespace-nowrap">
                            {STATUS_LABELS[row.status]}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside
          aria-label="Szczegóły"
          className="flex max-w-[400px] flex-[1_1_340px] flex-col gap-5"
        >
          {detail ? (
            <Card className="border-t-navy flex flex-col gap-2.5 border-t-4 p-[22px]">
              <span className="text-muted-foreground text-[0.9375rem] font-bold">
                {detail.autor_nazwa ?? "Autor"}
              </span>
              {/* Picking a row (?idea=) moves focus here, to the details it opened */}
              <FocusHeading
                focusKey={selectedId}
                className="font-heading text-[1.375rem] font-bold"
              >
                {detail.tytul}
              </FocusHeading>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_BADGE[detail.status]}>{STATUS_LABELS[detail.status]}</Badge>
                {detail.etap ? (
                  <span className="text-muted-foreground text-base">
                    etap: {STAGE_LABELS[detail.etap] ?? detail.etap}
                  </span>
                ) : null}
              </div>
              {detail.istota ? (
                <p className="text-muted-foreground text-base">{detail.istota}</p>
              ) : null}
              {detail.opis ? <p className="text-base">{detail.opis}</p> : null}
              {detail.dla_kogo ? (
                <p className="text-base">
                  <strong>Dla kogo:</strong> {detail.dla_kogo}
                </p>
              ) : null}
              {detail.komentarz ? (
                <p className="bg-neutral-soft rounded-[10px] p-3 text-base">
                  <strong>Ostatnia odpowiedź:</strong> {detail.komentarz}
                </p>
              ) : null}
              <ReviewForm
                ideaId={detail.idea_id}
                experts={experts}
                currentExpertId={detail.ekspert_id}
              />
              <Link
                href={`/my/messages?idea=${detail.idea_id}&topic=${encodeURIComponent(detail.tytul)}`}
                className="self-start text-base"
              >
                Rozmowa z autorem
              </Link>
            </Card>
          ) : null}

          <section
            aria-labelledby="audit-heading"
            className="flex flex-col gap-1.5 text-[0.9375rem]"
          >
            <h2 id="audit-heading" className="text-muted-foreground font-bold">
              Dziennik zmian
            </h2>
            {audit.length === 0 ? (
              <p className="text-muted-foreground">Jeszcze nic się nie zmieniło.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {audit.map((a) => (
                  <li key={a.id}>
                    <span className="text-muted-foreground">{formatSentAt(a.created_at)}</span>{" "}
                    {describeAudit(a.akcja, a.szczegoly)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
