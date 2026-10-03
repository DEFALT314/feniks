"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { announce } from "@/components/ui/announcer";
import { createClient } from "@/lib/supabase/client";
import { authorizeRealtime } from "@/lib/supabase/realtime";
import { newMessageAnnouncement, type LastMessage } from "../_lib/announce";

// Re-renders the open conversation when someone else writes in it (Supabase Realtime, RLS),
// and tells screen-reader users that a message arrived (WCAG 4.1.3): "Nowa wiadomość od …".
export function LiveRefresh({ threadId, last }: { threadId: string; last: LastMessage }) {
  const router = useRouter();
  const previous = useRef<LastMessage | null>(null);
  useEffect(() => {
    const message = newMessageAnnouncement(previous.current, last);
    previous.current = last;
    if (message) announce(message);
  }, [last]);
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
