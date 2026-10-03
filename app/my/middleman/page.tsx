import type { SupabaseClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import Link from "next/link";
import { getInnovations } from "@/app/library/_lib/data";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { CALLS } from "@/lib/ai/creator/creator";
import { listMyCards, toServiceCard } from "@/lib/ai/middleman/store";
import type { ServiceCard } from "@/lib/contracts/middleman";
import { createClient } from "@/lib/supabase/server";
import { MiddlemanWorkbench } from "./_components/workbench";
import { defaultInstitution } from "./_lib/institution";

// Module VII, Middleman (P3). Mockup: design/makiety/Middleman.dc.html.
// API: POST /api/ai/middleman, PATCH /api/ai/middleman/[id], POST /api/ai/middleman/[id]/send.

export const metadata: Metadata = { title: "Karta usługi dla gminy – HubMI.pl" };

type Props = { searchParams: Promise<{ innovation?: string; card?: string }> };

export default async function Page({ searchParams }: Props) {
  const { innovation, card } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    const back = `/my/middleman${innovation ? `?innovation=${encodeURIComponent(innovation)}` : ""}`;
    return (
      <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed">
        <div className="mx-auto flex max-w-[820px] flex-col gap-4 px-4 py-16 sm:px-10">
          <h1 className="text-[clamp(2rem,5vw,2.5rem)] leading-tight font-bold">
            Karta usługi dla Twojej gminy
          </h1>
          <p>
            Tu gmina, ośrodek pomocy albo organizacja zamienia innowację z Biblioteki ROPS w szkic
            usługi, którą może zamówić i sfinansować. Zaloguj się, żeby zapisać kartę jako swoją i
            wysłać ją do ROPS.
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(back)}`}
            className={`${buttonVariants()} self-start`}
          >
            Zaloguj się
          </Link>
        </div>
      </main>
    );
  }

  const db = (await createClient()) as unknown as SupabaseClient;
  const [innovations, institutionRow, rows] = await Promise.all([
    getInnovations(),
    user.institutionId
      ? db
          .from("instytucje")
          .select("nazwa, typ")
          .eq("id", user.institutionId)
          .maybeSingle()
          .then((r) => r.data)
      : Promise.resolve(null),
    listMyCards(db, user.id),
  ]);
  const byId = new Map(innovations.map((i) => [i.id, i]));
  const options = innovations
    .filter((i) => i.opublikowana)
    .sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"))
    .map((i) => ({ id: i.id, nazwa: i.nazwa }));
  const cards: ServiceCard[] = rows.flatMap((r) => {
    const i = byId.get(r.innovation_id);
    return i ? [toServiceCard(r, i)] : [];
  });
  const opened = cards.find((c) => c.id === card);
  const initialInnovationId =
    (innovation && byId.has(innovation) ? innovation : null) ??
    opened?.based_on.id ??
    options[0]?.id ??
    "";

  return (
    <main id="main-content" className="bg-surface text-ink text-lg leading-relaxed print:bg-white">
      {/* The printed page ("Drukuj albo zapisz jako PDF") shows only the card and its sources. */}
      <style>{`@media print { body > header, header, footer, nav[aria-label="Twoje karty usług"] { display: none !important; } }`}</style>
      <MiddlemanWorkbench
        innovations={options}
        initialInnovationId={initialInnovationId}
        initialInstitution={opened?.institution ?? defaultInstitution(institutionRow)}
        cards={cards}
        initialCardId={opened?.id ?? null}
        calls={CALLS}
      />
    </main>
  );
}
