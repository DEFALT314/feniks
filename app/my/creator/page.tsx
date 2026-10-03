import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MyIdeas } from "./_components/my-ideas";
import { SignInPrompt } from "./_components/states";
import { listMyIdeas } from "./_lib/ideas";

export const metadata: Metadata = {
  title: "Moje pomysły – HubMI.pl",
  description: "Kreator pomysłów: kanwa innowacji krok po kroku i fiszka pomysłu dla ROPS.",
};

export default async function CreatorPage() {
  const user = await getCurrentUser();
  if (!user) return <SignInPrompt next="/my/creator" />;
  return <MyIdeas ideas={await listMyIdeas(await createClient(), user.id)} />;
}
