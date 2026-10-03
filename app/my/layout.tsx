import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signInUrl } from "@/lib/auth/sign-in-redirect";
import { PATHNAME_HEADER } from "@/lib/supabase/proxy";

// Every page under /my/* needs an account (#67). Checked on the server for each request
// (CLAUDE.md rule 1); new pages in /my/ are protected automatically.
export default async function MyAreaLayout({ children }: LayoutProps<"/my">) {
  if (!(await getCurrentUser())) {
    redirect(signInUrl((await headers()).get(PATHNAME_HEADER) ?? "/my/creator"));
  }
  return children;
}
