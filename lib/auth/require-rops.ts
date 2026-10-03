import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PATHNAME_HEADER } from "@/lib/supabase/proxy";
import { adminAccess, getCurrentUser, type CurrentUser } from ".";
import { signInUrl } from "./sign-in-redirect";

/**
 * The /admin role check. Call it first in the layout AND in every page: Next.js renders a layout and
 * its page in parallel, so a check in the layout alone still lets the page render and stream its
 * data (behind app/loading.tsx the response has already started). After signing in, ROPS staff come
 * back to the page they asked for.
 */
export async function requireRops(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  const access = adminAccess(user);
  if (access === "sign-in") {
    redirect(signInUrl((await headers()).get(PATHNAME_HEADER) ?? "/admin"));
  }
  if (access === "forbidden" || !user) redirect("/");
  return user;
}
