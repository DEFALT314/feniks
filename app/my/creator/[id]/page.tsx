import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signInUrl } from "@/lib/auth/sign-in-redirect";
import { createClient } from "@/lib/supabase/server";
import { getMyIdea } from "../_lib/ideas";
import { canSubmit } from "../_lib/submission";
import { IdeaNotFound } from "../_components/states";
import { Wizard } from "../_components/wizard";

export const metadata: Metadata = {
  title: "Kanwa innowacji – HubMI.pl",
};

export default async function CanvasPage({ params, searchParams }: PageProps<"/my/creator/[id]">) {
  const [{ id }, { step }] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect(signInUrl(`/my/creator/${id}`)); // app/my/layout.tsx checks first
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
