"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useReducer, useRef, useState } from "react";
import { announce } from "@/components/ui/announcer";
import { buttonVariants } from "@/components/ui/button";
import { notificationsLabel } from "@/components/ui/navigation";
import { Notification } from "@/lib/contracts/notifications";
import { createClient } from "@/lib/supabase/client";
import { authorizeRealtime } from "@/lib/supabase/realtime";
import { cn } from "@/lib/utils";
import { bellReducer, loadedSummary, shortTime } from "./bell-state";

// Header bell (#7): unread count, live updates through Supabase Realtime (RLS: own rows only),
// a list of the latest notifications and "mark all as read".
export function NotificationBell({
  userId,
  initialUnread,
}: {
  userId: string;
  initialUnread: number;
}) {
  const [state, dispatch] = useReducer(bellReducer, {
    unread: initialUnread,
    items: null,
    announcement: "",
    announcementId: 0,
  });
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // New live notifications go to the one global live region; the id makes a repeat readable
  useEffect(() => {
    if (state.announcementId > 0) announce(state.announcement);
  }, [state.announcementId, state.announcement]);

  // Live updates: a new notification bumps the counter and is announced to screen readers.
  useEffect(() => {
    const supabase = createClient();
    const filter = `user_id=eq.${userId}`;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let stopAuth = () => {};
    // The token must reach Realtime first, otherwise RLS hides every row (see authorizeRealtime).
    void authorizeRealtime(supabase).then((stop) => {
      stopAuth = stop;
      if (cancelled) return stop();
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter },
          (p) => {
            const item = Notification.safeParse(p.new);
            if (item.success) dispatch({ type: "received", item: item.data });
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter },
          (p) => {
            const item = Notification.safeParse(p.new);
            if (item.success) dispatch({ type: "updated", item: item.data });
          },
        )
        .subscribe();
    });
    return () => {
      cancelled = true;
      stopAuth();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId]);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications", { cache: "no-store" });
    if (!res.ok) return;
    const body = await res.json();
    dispatch({ type: "loaded", items: body.powiadomienia, unread: body.nieprzeczytane });
    announce(loadedSummary(body.powiadomienia?.length ?? 0, body.nieprzeczytane ?? 0));
  }, []);

  const markRead = useCallback(async (ids?: string[]) => {
    dispatch({ type: "read", ids });
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : {}),
    }).catch(() => {});
  }, []);

  // Close on Escape (focus back to the button) and on a click outside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && state.items === null) void load();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={notificationsLabel(state.unread)}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "relative")}
      >
        <Bell aria-hidden="true" />
        {state.unread > 0 ? (
          <span
            aria-hidden="true"
            className="bg-brick absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white"
          >
            {state.unread > 99 ? "99+" : state.unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-label="Powiadomienia"
          className="border-border absolute right-0 z-40 mt-2 flex w-[min(360px,calc(100vw-2rem))] flex-col rounded-xl border bg-white shadow-[0_12px_32px_-12px_rgba(21,26,35,0.3)]"
        >
          <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3">
            <h2 ref={headingRef} tabIndex={-1} className="font-bold">
              Powiadomienia
            </h2>
            {state.unread > 0 ? (
              <button
                type="button"
                onClick={() => {
                  // The button disappears once nothing is unread: keep focus in the panel
                  headingRef.current?.focus();
                  announce("Wszystkie powiadomienia oznaczone jako przeczytane.");
                  void markRead();
                }}
                className="text-navy min-h-11 cursor-pointer text-base underline underline-offset-[3px]"
              >
                Oznacz wszystkie jako przeczytane
              </button>
            ) : null}
          </div>
          {state.items === null ? (
            <p className="text-muted-foreground px-4 py-4 text-base">Wczytujemy…</p>
          ) : state.items.length === 0 ? (
            <p className="text-muted-foreground px-4 py-4 text-base">
              Nie masz jeszcze powiadomień.
            </p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {state.items.slice(0, 15).map((n) => (
                <li key={n.id} className="border-border border-b last:border-b-0">
                  <Link
                    href={n.link ?? "/my/messages"}
                    onClick={() => {
                      if (!n.przeczytane) void markRead([n.id]);
                      setOpen(false);
                    }}
                    className={cn(
                      "text-ink hover:bg-navy-soft/40 flex gap-3 px-4 py-3 no-underline",
                      !n.przeczytane && "bg-navy-soft/30",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-2 size-2.5 shrink-0 rounded-full",
                        n.przeczytane ? "bg-transparent" : "bg-brick",
                      )}
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className={cn("text-base", !n.przeczytane && "font-bold")}>
                        {n.tytul}
                        {!n.przeczytane ? <span className="sr-only"> (nowe)</span> : null}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {shortTime(n.created_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
