import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Gives Realtime the signed-in user's access token before subscribing. The browser client reads
 * the session from cookies lazily, so without this the socket joins as anonymous and RLS (rightly)
 * delivers no rows: the bell only updated after a page reload. Keeps the token fresh on refresh.
 * Returns a cleanup function.
 */
export async function authorizeRealtime(supabase: Pick<SupabaseClient, "auth" | "realtime">) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) await supabase.realtime.setAuth(session.access_token);

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, next) => {
    if (next?.access_token) void supabase.realtime.setAuth(next.access_token);
  });
  return () => subscription.unsubscribe();
}
