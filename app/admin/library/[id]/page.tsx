import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getInnovationById } from "@/app/library/_lib/data";
import { AdminNav } from "../../_components/admin-nav";
import { EditForm } from "./edit-form";

export const metadata: Metadata = { title: "Edycja karty innowacji – Panel ROPS – HubMI.pl" };

// Access is checked in app/admin/layout.tsx; writes go through RLS (rops_redaktor, rops_admin)
export default async function Page({ params }: PageProps<"/admin/library/[id]">) {
  const { id } = await params;
  const [innovation, categories] = await Promise.all([getInnovationById(id), getCategories()]);
  if (!innovation) notFound();

  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
      <AdminNav current="/admin/library" />
      <div className="mx-auto flex max-w-[860px] flex-col gap-6 px-4 py-8 sm:px-10">
        <nav aria-label="Ścieżka" className="text-base">
          <Link href="/admin/library" className="text-navy underline underline-offset-[3px]">
            Biblioteka w panelu
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
              Zobacz kartę publiczną
            </Link>
          </p>
        </div>
        <div className="border-border rounded-xl border bg-white p-6">
          <EditForm innovation={innovation} categories={categories} />
        </div>
      </div>
    </main>
  );
}
