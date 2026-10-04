"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { announce } from "@/components/ui/announcer";
import { createClient } from "@/lib/supabase/client";
import { authorizeRealtime } from "@/lib/supabase/realtime";
import { newMessageAnnouncement, type LastMessage } from "../_lib/announce";

const POLL_MS = 10_000;

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
  // /my/messages without ?thread= opens the newest conversation. Pin it in the address, so a
  // refresh (live or polled) keeps this conversation open when a newer one arrives.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("thread") === threadId) return;
    url.searchParams.set("thread", threadId);
    window.history.replaceState(window.history.state, "", url);
  }, [threadId]);
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let stopAuth = () => {};
    let live = false;
    // Without Realtime (blocked WebSocket) the conversation reloads itself every POLL_MS
    const timer = window.setInterval(() => {
      if (!live && document.visibilityState === "visible") router.refresh();
    }, POLL_MS);
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
        .subscribe((status) => {
          live = status === "SUBSCRIBED";
        });
    });
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      stopAuth();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [threadId, router]);
  return null;
}
