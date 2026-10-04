import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signInUrl } from "@/lib/auth/sign-in-redirect";
import { createClient } from "@/lib/supabase/server";
import { MyIdeas } from "./_components/my-ideas";
import { listMyIdeas } from "./_lib/ideas";

export const metadata: Metadata = {
  title: "Moje pomysły – HubMI.pl",
  description: "Opisz swój pomysł krok po kroku i wyślij go do ROPS.",
};

export default async function CreatorPage() {
  const user = await getCurrentUser();
  if (!user) redirect(signInUrl("/my/creator")); // app/my/layout.tsx checks first
  return <MyIdeas ideas={await listMyIdeas(await createClient(), user.id)} />;
}
