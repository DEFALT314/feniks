import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMyIdea } from "../_lib/ideas";
import { canSubmit } from "../_lib/submission";
import { IdeaNotFound, SignInPrompt } from "../_components/states";
import { Wizard } from "../_components/wizard";

export const metadata: Metadata = {
  title: "Kanwa innowacji – HubMI.pl",
};

export default async function CanvasPage({ params, searchParams }: PageProps<"/my/creator/[id]">) {
  const [{ id }, { step }] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) return <SignInPrompt next={`/my/creator/${id}`} />;
  const idea = await getMyIdea(await createClient(), user.id, id);
  if (!idea) return <IdeaNotFound />;
  // key: a refreshed copy from the database (e.g. after browser Back) replaces the local state
  return (
    <Wizard
      key={idea.updated_at}
      idea={idea}
      stepId={typeof step === "string" ? step : undefined}
      editable={canSubmit(idea.wyslany_at, idea.status)}
    />
  );
}
