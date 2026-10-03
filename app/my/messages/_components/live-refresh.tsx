"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { authorizeRealtime } from "@/lib/supabase/realtime";

// Re-renders the open conversation when someone else writes in it (Supabase Realtime, RLS).
export function LiveRefresh({ threadId }: { threadId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let stopAuth = () => {};
    void authorizeRealtime(supabase).then((stop) => {
      stopAuth = stop;
      if (cancelled) return stop();
      channel = supabase
        .channel(`messages:${threadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `thread_id=eq.${threadId}`,
          },
          () => router.refresh(),
        )
        .subscribe();
    });
    return () => {
      cancelled = true;
      stopAuth();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [threadId, router]);
  return null;
}
