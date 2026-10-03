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

export default async function CardPage({ params }: PageProps<"/my/creator/[id]/card">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return <SignInPrompt next={`/my/creator/${id}/card`} />;
  const idea = await getMyIdea(await createClient(), user.id, id);
  if (!idea) return <IdeaNotFound />;
  return <IdeaCard key={idea.id} idea={idea} calls={CALLS} />;
}
