import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { CALLS } from "@/lib/ai/creator/creator";
import { createClient } from "@/lib/supabase/server";
import { IdeaCard } from "../../_components/card-form";
import { IdeaNotFound, SignInPrompt } from "../../_components/states";
import { getMyIdea } from "../../_lib/ideas";

export const metadata: Metadata = {
  title: "Fiszka pomysłu – HubMI.pl",
};

export default async function CardPage({
  params,
  searchParams,
}: PageProps<"/my/creator/[id]/card">) {
  const [{ id }, { sent }] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) return <SignInPrompt next={`/my/creator/${id}/card`} />;
  const idea = await getMyIdea(await createClient(), user.id, id);
  if (!idea) return <IdeaNotFound />;
  // key: a refreshed copy from the database (e.g. after browser Back) replaces the local state
  return (
    <IdeaCard
      key={idea.updated_at}
      idea={idea}
      calls={CALLS}
      justSent={sent === "first" || sent === "again" ? sent : null}
    />
  );
}
