import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getInnovationById } from "@/app/library/_lib/data";
import { AdminNav } from "../../_components/admin-nav";
import { EditForm } from "./edit-form";
import { requireRops } from "@/lib/auth/require-rops";

export const metadata: Metadata = { title: "Edycja karty innowacji – Panel ROPS – HubMI.pl" };

// Access is checked in app/admin/layout.tsx; writes go through RLS (rops_redaktor, rops_admin)
export default async function Page({ params, searchParams }: PageProps<"/admin/library/[id]">) {
  await requireRops();
  const { id } = await params;
  const justCreated = (await searchParams).new === "1";
  const [innovation, categories] = await Promise.all([getInnovationById(id), getCategories()]);
  if (!innovation) notFound();

  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
      <AdminNav current="/admin/library" />
      <div className="mx-auto flex max-w-[860px] flex-col gap-6 px-4 py-8 sm:px-10">
        <nav aria-label="Ścieżka" className="text-base">
          <Link href="/admin/library" className="text-navy underline underline-offset-[3px]">
            Karty innowacji
          </Link>{" "}
          › <span aria-current="page">{innovation.nazwa}</span>
        </nav>
        <div className="flex flex-col gap-2">
          <h1 className="text-[clamp(1.75rem,4vw,2.5rem)] leading-tight font-bold tracking-tight">
            Edycja karty: {innovation.nazwa}
          </h1>
          <p className="text-muted-foreground">
            Zmiany są widoczne w Bibliotece od razu i trafiają do dziennika zmian.{" "}
            <Link
              href={`/library/${innovation.id}`}
              className="text-navy underline underline-offset-[3px]"
            >
              Zobacz kartę w Bibliotece
            </Link>
          </p>
        </div>
        {!innovation.opublikowana ? (
          <p
            role="status"
            className="border-warning bg-warning-soft rounded-xl border p-4 text-base"
          >
            {justCreated ? "Karta została dodana. " : ""}
            Karta jest ukryta: nie widać jej w Bibliotece ani w dopasowaniu. Uzupełnij opis, zaznacz
            „Opublikowana w Bibliotece” i zapisz zmiany.
          </p>
        ) : null}
        <div className="border-border rounded-xl border bg-white p-6">
          <EditForm innovation={innovation} categories={categories} />
        </div>
      </div>
    </main>
  );
}
