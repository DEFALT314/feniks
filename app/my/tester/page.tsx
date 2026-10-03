import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isRopsRole } from "@/lib/auth";
import { signInUrl } from "@/lib/auth/sign-in-redirect";
import { createClient } from "@/lib/supabase/server";
import { TesterView } from "./_components/tester-view";
import { loadTester } from "./_lib/tests";

export const metadata: Metadata = {
  title: "Testy nowych rozwiązań – HubMI.pl",
  description:
    "Zapisz się na test nowego rozwiązania, wypróbuj je i powiedz autorom, co działa, a co poprawić.",
};

export default async function TesterPage() {
  const user = await getCurrentUser();
  if (!user) redirect(signInUrl("/my/tester")); // app/my/layout.tsx checks first
  const page = await loadTester(await createClient(), {
    id: user.id,
    isRops: isRopsRole(user.role),
  });
  return <TesterView tests={page.tests} feedback={page.feedback} />;
}
