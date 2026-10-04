import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { signInUrl } from "@/lib/auth/sign-in-redirect";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ideaAreas, rankCalls, type IdeaArea } from "@/lib/ai/creator/call-fit";
import { openCalls } from "@/lib/ai/creator/open-calls";
import { searchDeps } from "@/lib/ai/matching/server";
import { createClient } from "@/lib/supabase/server";
import { PlanTestPanel } from "@/app/my/tester/_components/plan-test-panel";
import { planTestDefaults } from "@/app/my/tester/_lib/model";
import { countIdeaTests } from "@/app/my/tester/_lib/tests";
import { IdeaCard } from "../../_components/card-form";
import { IdeaNotFound } from "../../_components/states";
import { getMyIdea } from "../../_lib/ideas";

// One database read per request, shared by the title and the page
const loadIdea = cache(async (id: string) => {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await createClient();
  return { user, db, idea: await getMyIdea(db, user.id, id) };
});

export async function generateMetadata({
  params,
}: PageProps<"/my/creator/[id]/card">): Promise<Metadata> {
  const loaded = await loadIdea((await params).id);
  const title = loaded?.idea?.tytul;
  return { title: title ? `Fiszka: ${title} – HubMI.pl` : "Fiszka pomysłu – HubMI.pl" };
}

export default async function CardPage({
  params,
  searchParams,
}: PageProps<"/my/creator/[id]/card">) {
  const [{ id }, { sent }] = await Promise.all([params, searchParams]);
  const loaded = await loadIdea(id);
  if (!loaded) redirect(signInUrl(`/my/creator/${id}/card`)); // app/my/layout.tsx checks first
  const { db, idea } = loaded;
  if (!idea) return <IdeaNotFound />;
  // Areas of the idea from the same search as /match (P3), to put the fitting calls first.
  const text = [idea.tytul, idea.opis, idea.istota, idea.dla_kogo].filter(Boolean).join(". ");
  const [testCount, calls, areas] = await Promise.all([
    countIdeaTests(db, idea.id),
    openCalls(),
    searchDeps(db as unknown as SupabaseClient)
      .then((deps) => ideaAreas(text, deps, idea.obszar_id))
      .catch((): IdeaArea[] => []),
  ]);
  // key: a refreshed copy from the database (e.g. after browser Back) replaces the local state
  return (
    <IdeaCard
      key={idea.updated_at}
      idea={idea}
      calls={rankCalls(calls, areas)}
      areas={areas}
      justSent={sent === "first" || sent === "again" ? sent : null}
      testPanel={
        <PlanTestPanel ideaId={idea.id} testCount={testCount} defaults={planTestDefaults(idea)} />
      }
    />
  );
}
