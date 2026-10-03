import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationList } from "@/lib/contracts/notifications";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

/** The signed-in user's latest notifications and unread count. RLS limits rows to their own. */
export async function loadNotifications(supabase: Client, limit = 50): Promise<NotificationList> {
  const [list, unread] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, user_id, typ, tytul, link, przeczytane, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("przeczytane", false),
  ]);
  if (list.error) throw new Error(`Failed to load notifications: ${list.error.message}`);
  return { powiadomienia: list.data ?? [], nieprzeczytane: unread.count ?? 0 };
}

/** Unread count only, for the header on every page. Returns 0 on any error. */
export async function unreadCount(supabase: Client): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("przeczytane", false);
  return error ? 0 : (count ?? 0);
}

/** Marks the given notifications (or all unread ones) as read. Column grant allows only this. */
export async function markRead(supabase: Client, ids?: string[]): Promise<void> {
  let query = supabase.from("notifications").update({ przeczytane: true }).eq("przeczytane", false);
  if (ids && ids.length > 0) query = query.in("id", ids);
  const { error } = await query;
  if (error) throw new Error(`Failed to mark notifications as read: ${error.message}`);
}
