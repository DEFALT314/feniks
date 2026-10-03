import type { Metadata } from "next";
import Link from "next/link";
import { getChallengeAreas } from "@/app/challenge-map/_lib/data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate, getCall, listAllCalls } from "@/lib/calls";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "../_components/admin-nav";
import { FocusHeading } from "@/components/ui/param-focus";
import { CallForm } from "./_components/call-form";
import { TogglePublishedForm } from "./_components/toggle-published-form";

export const metadata: Metadata = { title: "Nabory – Panel ROPS – HubMI.pl" };

// Module VI, calls for proposals (#10): list, add, edit, switch on/off. Role checked in ../layout.tsx.
export default async function CallsPage({ searchParams }: PageProps<"/admin/calls">) {
  const params = await searchParams;
  const supabase = await createClient();
  const editId = typeof params.edit === "string" ? params.edit : null;
  const [calls, areas, editing] = await Promise.all([
    listAllCalls(supabase),
    getChallengeAreas(),
    editId ? getCall(supabase, editId) : Promise.resolve(null),
  ]);
  const areaName = new Map(areas.map((a) => [a.id, a.nazwa]));

  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <AdminNav current="/admin/calls" />
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap gap-10 px-4 pt-8 pb-16 sm:px-10">
        <section
          aria-labelledby="calls-heading"
          className="flex min-w-0 flex-[999_1_560px] flex-col gap-3"
        >
          <h1 id="calls-heading" className="font-heading text-2xl font-bold">
            Nabory
          </h1>
          <p className="text-muted-foreground">
            Włączone nabory widzą autorzy pomysłów w generatorze wniosków. Wyłączone są widoczne
            tylko dla ROPS.
          </p>
          {calls.length === 0 ? (
            <Card>
              <p>Nie ma jeszcze naborów. Dodaj pierwszy w formularzu obok.</p>
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {calls.map((c) => (
                <li key={c.id}>
                  <Card className="flex flex-col gap-2 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-xl font-bold">{c.nazwa}</h2>
                      <Badge variant={c.opublikowany ? "success" : "neutral"}>
                        {c.opublikowany ? "Włączony" : "Wyłączony"}
                      </Badge>
                      {c.demo ? <Badge variant="warning">Dane demonstracyjne</Badge> : null}
                    </div>
                    <p className="text-base">
                      <strong>Termin:</strong> {c.termin_od ? `${formatDate(c.termin_od)} – ` : ""}
                      {formatDate(c.termin_do)}
                    </p>
                    {c.cel ? <p className="text-muted-foreground text-base">{c.cel}</p> : null}
                    {c.obszary.length ? (
                      <p className="text-base">
                        <strong>Obszary:</strong>{" "}
                        {c.obszary.map((o) => areaName.get(o) ?? o).join(", ")}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Link
                        href={`/admin/calls?edit=${c.id}`}
                        className="inline-flex min-h-11 items-center text-base font-bold"
                      >
                        Edytuj<span className="sr-only">: {c.nazwa}</span>
                      </Link>
                      <TogglePublishedForm
                        id={c.id}
                        name={c.nazwa}
                        published={Boolean(c.opublikowany)}
                      />
                      {c.url ? (
                        <a
                          href={c.url}
                          className="text-base"
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Strona naboru
                          <span className="sr-only"> (otwiera się w nowej karcie)</span>
                        </a>
                      ) : null}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside
          aria-labelledby="call-form-heading"
          className="flex max-w-[440px] flex-[1_1_360px] flex-col gap-3"
        >
          <Card className="border-t-navy flex flex-col gap-4 border-t-4 p-[22px]">
            {/* "Edytuj" (?edit=) moves focus to the form it opened */}
            <FocusHeading
              id="call-form-heading"
              focusKey={editId}
              className="font-heading text-[1.375rem] font-bold"
            >
              {editing ? `Edycja: ${editing.nazwa}` : "Nowy nabór"}
            </FocusHeading>
            <CallForm call={editing} areas={areas.map((a) => ({ id: a.id, nazwa: a.nazwa }))} />
          </Card>
        </aside>
      </div>
    </main>
  );
}
