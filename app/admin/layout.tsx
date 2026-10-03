import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminAccess, getCurrentUser } from "@/lib/auth";
import { signInUrl } from "@/lib/auth/sign-in-redirect";
import { PATHNAME_HEADER } from "@/lib/supabase/proxy";

// The real security boundary for /admin/*: the role is checked on the server for every request.
// After signing in, ROPS staff come back to the page they asked for (e.g. /admin/trends).
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const access = adminAccess(await getCurrentUser());
  if (access === "sign-in") {
    redirect(signInUrl((await headers()).get(PATHNAME_HEADER) ?? "/admin"));
  }
  if (access === "forbidden") redirect("/");
  return children;
}
