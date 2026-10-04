import "server-only";
import { getCurrentUser, headerName } from "@/lib/auth";
import { sendEmail, siteUrl } from "@/lib/email";
import type { MessagingDeps } from "@/lib/messaging";
import { addNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

/** Messaging dependencies for the signed-in user, or null for a guest. */
export async function messagingDeps(): Promise<MessagingDeps | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  return {
    supabase,
    me: { id: user.id, role: user.role, name: headerName(user) },
    sendEmail: (m) => sendEmail(m),
    ropsInbox: process.env.ROPS_NOTIFY_EMAIL || process.env.SMTP_USER,
    siteUrl: siteUrl(),
    addNotification: (n) => addNotification(n, supabase),
  };
}
