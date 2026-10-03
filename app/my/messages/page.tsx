import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FocusHeading } from "@/components/ui/param-focus";
import { STATUS_BADGE, STATUS_LABELS } from "@/app/admin/_lib/status";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser, isRopsRole } from "@/lib/auth";
import {
  ideaThreadId,
  loadThread,
  loadThreads,
  markThreadSeen,
  type ThreadMessage,
} from "@/lib/messaging";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { InviteForm } from "./_components/invite-form";
import { LiveRefresh } from "./_components/live-refresh";
import { MessageList } from "./_components/message-list";
import { ReplyForm } from "./_components/reply-form";
import type { LastMessage } from "./_lib/announce";
import { historyLine, newMessageHref, recipientOptions, when } from "./_lib/format";

export const metadata: Metadata = { title: "Wiadomości – HubMI.pl" };

// Module V, conversations (#8). Layout per design/makiety/Wiadomosci.dc.html. Sign-in: app/my/layout.tsx.
export default async function MessagesPage({ searchParams }: PageProps<"/my/messages">) {
  const user = (await getCurrentUser())!;
  const params = await searchParams;
  const supabase = await createClient();
  // ?idea=<id>: open the conversation about that idea when there already is one
  if (typeof params.idea === "string" && !params.thread) {
    const existing = await ideaThreadId(supabase, params.idea);
    if (existing) redirect(`/my/messages?thread=${existing}`);
  }
  // Old "Zapytaj ROPS" links (/my/messages?innovation=…) open the new-message form, not the list
  const prefill = newMessageHref(params);
  if (prefill) redirect(prefill);
  const threads = await loadThreads(supabase, user.id);
  const selectedId = (typeof params.thread === "string" && params.thread) || threads[0]?.id || null;
  const thread = selectedId ? await loadThread(supabase, selectedId, user.id) : null;
  if (thread) await markThreadSeen(supabase, thread.id);
  const fromRops = isRopsRole(user.role);
  // ROPS can invite people who are not in the conversation yet
  const invitees =
    thread && fromRops
      ? recipientOptions((await supabase.rpc("contact_directory")).data ?? []).filter(
          (o) => o.value && !thread.participant_ids.includes(o.value),
        )
      : [];

  return (
    <main
      id="main-content"
      className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 pt-9 pb-16 sm:px-10"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-heading text-[2.5rem] font-bold tracking-tight">Wiadomości</h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {user.role !== "ekspert" && !isRopsRole(user.role) ? (
            <Link href="/my/messages/new?recipient=ekspert" className="text-base">
              Zapytaj eksperta (mentora)
            </Link>
          ) : null}
          <Link href="/my/messages/new" className={buttonVariants({ variant: "secondary" })}>
            {isRopsRole(user.role) ? "Nowa wiadomość" : "Napisz do ROPS"}
          </Link>
        </div>
      </div>

      {threads.length === 0 ? (
        <div className="border-border flex flex-col gap-3 rounded-xl border bg-white p-8">
          <p className="text-lg">Nie masz jeszcze żadnych rozmów.</p>
          <p className="text-muted-foreground">
            Napisz do ROPS z pytaniem albo potrzebą, zapytaj eksperta (mentora) albo napisz do
            organizacji lub gminy. Gdy ROPS oceni Twój pomysł, rozmowa o nim też pojawi się tutaj.
          </p>
        </div>
      ) : (
        <div className="border-border flex min-h-[640px] flex-wrap overflow-hidden rounded-xl border bg-white">
          <nav
            aria-label="Rozmowy"
            className="border-border max-w-[360px] flex-[1_1_300px] border-r"
          >
            <ul>
              {threads.map((t) => {
                const active = t.id === thread?.id;
                return (
                  <li key={t.id}>
                    <Link
                      href={`/my/messages?thread=${t.id}`}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "border-border text-ink hover:bg-navy-soft/40 flex flex-col gap-0.5 border-b px-5 py-4 no-underline",
                        active && "bg-navy-soft/50 shadow-[inset_4px_0_0_var(--navy)]",
                      )}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <strong>{t.temat}</strong>
                        {t.unread > 0 ? (
                          <span className="bg-brick shrink-0 rounded-full px-2 text-sm font-bold text-white">
                            {t.unread}
                            <span className="sr-only"> nowe</span>
                          </span>
                        ) : null}
                      </span>
                      <span className="text-muted-foreground text-base">
                        {[t.others.join(", ") || "ROPS", when(t.last_message_at)].join(" · ")}
                      </span>
                      {t.idea_status ? (
                        <Badge variant={STATUS_BADGE[t.idea_status]} className="mt-1 self-start">
                          {STATUS_LABELS[t.idea_status]}
                        </Badge>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {thread ? (
            <section
              aria-labelledby="thread-heading"
              className="flex min-w-0 flex-[999_1_480px] flex-col gap-2 px-5 py-6 sm:px-8"
            >
              <LiveRefresh threadId={thread.id} last={lastMessage(thread)} />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                {/* Picking another conversation (?thread=) moves focus here */}
                <FocusHeading
                  id="thread-heading"
                  focusKey={thread.id}
                  className="font-heading text-2xl font-bold"
                >
                  {thread.temat}
                </FocusHeading>
                {thread.history.length > 0 ? (
                  <span className="text-muted-foreground text-[0.9375rem]">
                    {historyLine(thread.history)}
                  </span>
                ) : null}
              </div>
              <p className="text-muted-foreground text-base">
                W rozmowie: {[...thread.others, "Ty"].join(", ")}.
                {fromRops ? null : " Zespół ROPS widzi każdą rozmowę i może pomóc."}
              </p>
              {fromRops ? <InviteForm threadId={thread.id} people={invitees} /> : null}
              <MessageList messages={thread.messages} />
              <ReplyForm key={thread.id} threadId={thread.id}>
                {thread.i_am_author && thread.idea_id ? (
                  <Link
                    href={`/my/creator/${thread.idea_id}`}
                    className={buttonVariants({ variant: "secondary" })}
                  >
                    Popraw fiszkę
                  </Link>
                ) : null}
              </ReplyForm>
            </section>
          ) : (
            <p className="p-8">Nie znaleziono tej rozmowy.</p>
          )}
        </div>
      )}
    </main>
  );
}

function lastMessage(thread: { id: string; messages: ThreadMessage[] }): LastMessage {
  const m = thread.messages.at(-1);
  return {
    threadId: thread.id,
    id: m?.id ?? null,
    mine: m?.mine ?? false,
    author: m?.autor_nazwa ?? "ROPS",
    text: m?.tresc ?? "",
  };
}
