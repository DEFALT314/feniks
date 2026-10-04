import type { Metadata } from "next";
import Link from "next/link";
import { getInnovations } from "@/app/library/_lib/data";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireRops } from "@/lib/auth/require-rops";
import { formatAverage, opinionsLabel } from "@/lib/innovation-feedback";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "../_components/admin-nav";
import { formatSentAt } from "../_lib/format";
import {
  loadInnovationOpinions,
  loadReviewedInnovations,
  loadTestOpinions,
  loadTests,
  type Opinion,
} from "../_lib/tests";
import { NewTestForm } from "./_components/new-test-form";
import { SummaryButton } from "./_components/summary-button";

export const metadata: Metadata = { title: "Testy i opinie – Panel ROPS" };

const DATE = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Warsaw",
});

// Module IV for ROPS: tests of Library innovations, their feedback and improvement proposals, and
// reviews of innovations outside tests. ?test=<id> or ?innovation=<id> opens the opinions.
export default async function TestsPage({ searchParams }: PageProps<"/admin/tests">) {
  await requireRops();
  const params = await searchParams;
  const supabase = await createClient();
  const testId = typeof params.test === "string" ? params.test : null;
  const innovationId = typeof params.innovation === "string" ? params.innovation : null;

  const [tests, reviewed, catalog] = await Promise.all([
    loadTests(supabase),
    loadReviewedInnovations(supabase),
    getInnovations(),
  ]);
  const selectedTest = testId ? tests.find((t) => t.id === testId) : null;
  const selectedInnovation = innovationId
    ? reviewed.find((r) => r.innowacja_id === innovationId)
    : null;
  const opinions: Opinion[] = selectedTest
    ? await loadTestOpinions(supabase, selectedTest.id)
    : selectedInnovation
      ? await loadInnovationOpinions(supabase, selectedInnovation.innowacja_id)
      : [];
  const innovations = catalog
    .map((i) => ({ id: i.id, nazwa: i.nazwa }))
    .sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"));

  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <AdminNav current="/admin/tests" />
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap gap-10 px-4 pt-8 pb-16 sm:px-10">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-8">
          <section aria-labelledby="tests-heading" className="flex flex-col gap-3">
            <h1 id="tests-heading" className="font-heading text-2xl font-bold">
              Testy rozwiązań
            </h1>
            {tests.length === 0 ? (
              <Card>
                <p>Nie ma jeszcze testów. Załóż pierwszy w formularzu obok.</p>
              </Card>
            ) : (
              <div className="border-border overflow-x-auto rounded-xl border bg-white">
                <table className="w-full border-collapse text-base">
                  <caption className="sr-only">Testy, zapisy i opinie</caption>
                  <thead>
                    <tr className="text-muted-foreground text-[0.9375rem]">
                      {["Test", "Termin", "Zapisani", "Średnia", "Propozycje usprawnień"].map(
                        (h) => (
                          <th
                            key={h}
                            scope="col"
                            className="border-border border-b px-3.5 py-3 text-left"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((t) => (
                      <tr
                        key={t.id}
                        className={t.id === selectedTest?.id ? "bg-navy-soft/50" : undefined}
                      >
                        <td className="border-border border-b px-3.5 py-3">
                          <Link href={`/admin/tests?test=${t.id}`} scroll={false}>
                            {t.tytul}
                          </Link>
                          <span className="text-muted-foreground block text-sm">{t.subject}</span>
                        </td>
                        <td className="border-border border-b px-3.5 py-3 whitespace-nowrap">
                          {t.termin ? DATE.format(new Date(t.termin)) : "bez terminu"}
                        </td>
                        <td className="border-border border-b px-3.5 py-3">
                          {t.zajete}
                          {t.liczba_miejsc ? ` / ${t.liczba_miejsc}` : ""}
                        </td>
                        <td className="border-border border-b px-3.5 py-3">
                          {t.average != null
                            ? `${formatAverage(t.average)} (${opinionsLabel(t.ratings)})`
                            : "—"}
                        </td>
                        <td className="border-border border-b px-3.5 py-3">{t.proposals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="reviews-heading" className="flex flex-col gap-3">
            <h2 id="reviews-heading" className="font-heading text-2xl font-bold">
              Opinie o rozwiązaniach z Biblioteki
            </h2>
            <p className="text-muted-foreground text-base">
              Oceny i propozycje usprawnień, które mieszkańcy i instytucje zostawiają na kartach
              innowacji.
            </p>
            {reviewed.length === 0 ? (
              <Card>
                <p>Nikt jeszcze nie ocenił rozwiązania na karcie innowacji.</p>
              </Card>
            ) : (
              <ul className="border-border overflow-hidden rounded-xl border bg-white">
                {reviewed.map((r) => (
                  <li key={r.innowacja_id} className="border-border border-b last:border-b-0">
                    <Link
                      href={`/admin/tests?innovation=${r.innowacja_id}`}
                      scroll={false}
                      aria-current={
                        r.innowacja_id === selectedInnovation?.innowacja_id ? "true" : undefined
                      }
                      className="text-ink hover:bg-navy-soft/40 aria-[current=true]:bg-navy-soft/50 flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 no-underline"
                    >
                      <strong>{r.nazwa}</strong>
                      <span className="text-muted-foreground text-base">
                        {formatAverage(r.average)} na 5 · {opinionsLabel(r.count)} · propozycji:{" "}
                        {r.proposals} · {formatSentAt(r.latest)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {selectedTest || selectedInnovation ? (
            <section aria-labelledby="opinions-heading" className="flex flex-col gap-4">
              <h2 id="opinions-heading" className="font-heading text-2xl font-bold">
                Opinie: {selectedTest?.tytul ?? selectedInnovation?.nazwa}
              </h2>
              <SummaryButton
                key={selectedTest?.id ?? selectedInnovation?.innowacja_id}
                target={
                  selectedTest
                    ? { kind: "test", id: selectedTest.id, subject: selectedTest.subject }
                    : {
                        kind: "innovation",
                        id: selectedInnovation!.innowacja_id,
                        subject: selectedInnovation!.nazwa,
                      }
                }
              />
              {opinions.length === 0 ? (
                <p>Jeszcze nikt nie zostawił opinii.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {opinions.map((o, i) => (
                    <li key={i}>
                      <Card className="flex flex-col gap-1.5 p-4">
                        <span className="font-bold">Ocena {o.ocena} na 5</span>
                        {o.co_dzialalo ? (
                          <p className="text-base">
                            <strong>Co działa:</strong> {o.co_dzialalo}
                          </p>
                        ) : null}
                        {o.co_poprawic ? (
                          <p className="text-base">
                            <Badge variant="warning" className="mr-2">
                              Propozycja usprawnienia
                            </Badge>
                            {o.co_poprawic}
                          </p>
                        ) : null}
                        <span className="text-muted-foreground text-sm">
                          {formatSentAt(o.created_at)}
                        </span>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        <aside
          aria-labelledby="new-test-heading"
          className="flex max-w-[440px] flex-[1_1_360px] flex-col gap-3"
        >
          <Card className="border-t-navy flex flex-col gap-4 border-t-4 p-[22px]">
            <h2 id="new-test-heading" className="font-heading text-[1.375rem] font-bold">
              Załóż test rozwiązania z Biblioteki
            </h2>
            <p className="text-muted-foreground text-base">
              Mieszkańcy zapiszą się w „Testach”, a po teście ocenią rozwiązanie i zaproponują
              usprawnienia.
            </p>
            <NewTestForm innovations={innovations} />
          </Card>
        </aside>
      </div>
    </main>
  );
}
