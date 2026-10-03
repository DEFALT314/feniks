import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewNotification } from "@/lib/contracts/notifications";
import { IdeaStatus } from "@/lib/contracts/admin";
import { Role } from "@/lib/contracts/shared";
import type { EmailMessage, EmailResult } from "@/lib/email";
import type { Database } from "@/lib/supabase/types";

// Messages between ROPS, idea authors and experts (module V, #8). Pure logic over a Supabase
// client: pages, server actions and endpoints pass in the session client and side effects.

type Client = SupabaseClient<Database>;

export type ThreadSummary = {
  id: string;
  temat: string;
  idea_id: string | null;
  innowacja_id: string | null;
  last_message_at: string;
  others: string[]; // names of the other participants
  unread: number;
  idea_status: IdeaStatus | null;
};

export type ThreadMessage = {
  id: string;
  autor_id: string | null;
  autor_nazwa: string | null;
  autor_rola: Role | null;
  tresc: string;
  created_at: string;
  mine: boolean;
};

export type StatusStep = { status: IdeaStatus | "wyslany"; at: string };

export type ThreadDetail = Omit<ThreadSummary, "unread"> & {
  messages: ThreadMessage[];
  history: StatusStep[];
  i_am_author: boolean;
};

type ParticipantRow = { user_id: string; nazwa: string | null; rola: string; last_read_at: string };

const ROPS: readonly string[] = ["rops_redaktor", "rops_admin"];
const isRops = (role: string | null | undefined) => role != null && ROPS.includes(role);

function displayName(p: { nazwa: string | null; rola: string }): string {
  if (p.nazwa) return p.nazwa;
  return isRops(p.rola) ? "Redakcja ROPS" : p.rola === "ekspert" ? "Ekspert" : "Autor";
}

function parseRole(value: unknown): Role | null {
  const r = Role.safeParse(value);
  return r.success ? r.data : null;
}

async function ideaStatuses(supabase: Client, ideaIds: string[]) {
  if (ideaIds.length === 0) return new Map<string, IdeaStatus>();
  const { data } = await supabase
    .from("idea_status")
    .select("idea_id, status")
    .in("idea_id", ideaIds);
  const map = new Map<string, IdeaStatus>();
  for (const row of data ?? []) {
    const s = IdeaStatus.safeParse(row.status);
    if (row.idea_id && s.success) map.set(row.idea_id, s.data);
  }
  return map;
}

/** Threads the user can see, newest activity first, with unread counts. */
export async function loadThreads(supabase: Client, userId: string): Promise<ThreadSummary[]> {
  const { data, error } = await supabase
    .from("threads")
    .select(
      "id, temat, idea_id, innowacja_id, last_message_at, thread_participants(user_id, nazwa, rola, last_read_at)",
    )
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to load threads: ${error.message}`);
  const threads = (data ?? []) as unknown as (Omit<
    ThreadSummary,
    "others" | "unread" | "idea_status"
  > & {
    thread_participants: ParticipantRow[];
  })[];

  const ids = threads.map((t) => t.id);
  const [messages, statuses] = await Promise.all([
    ids.length
      ? supabase.from("messages").select("thread_id, autor_id, created_at").in("thread_id", ids)
      : Promise.resolve({
          data: [] as { thread_id: string; autor_id: string | null; created_at: string }[],
        }),
    ideaStatuses(
      supabase,
      threads.flatMap((t) => (t.idea_id ? [t.idea_id] : [])),
    ),
  ]);

  return threads.map((t) => {
    const me = t.thread_participants.find((p) => p.user_id === userId);
    const lastRead = me ? new Date(me.last_read_at).getTime() : 0;
    const unread = (messages.data ?? []).filter(
      (m) =>
        m.thread_id === t.id &&
        m.autor_id !== userId &&
        new Date(m.created_at).getTime() > lastRead,
    ).length;
    return {
      id: t.id,
      temat: t.temat,
      idea_id: t.idea_id,
      innowacja_id: t.innowacja_id,
      last_message_at: t.last_message_at,
      others: t.thread_participants.filter((p) => p.user_id !== userId).map(displayName),
      unread,
      idea_status: t.idea_id ? (statuses.get(t.idea_id) ?? "nowy") : null,
    };
  });
}

/** One thread with its messages and, for an idea thread, the status history. Null if not visible. */
export async function loadThread(
  supabase: Client,
  threadId: string,
  userId: string,
): Promise<ThreadDetail | null> {
  const { data } = await supabase
    .from("threads")
    .select(
      "id, temat, idea_id, innowacja_id, last_message_at, thread_participants(user_id, nazwa, rola, last_read_at)",
    )
    .eq("id", threadId)
    .maybeSingle();
  if (!data) return null;
  const thread = data as unknown as Omit<
    ThreadDetail,
    "messages" | "history" | "others" | "idea_status" | "i_am_author"
  > & {
    thread_participants: ParticipantRow[];
  };

  const [{ data: rows }, idea, reviews] = await Promise.all([
    supabase
      .from("messages")
      .select("id, autor_id, autor_nazwa, autor_rola, tresc, created_at")
      .eq("thread_id", threadId)
      .order("created_at"),
    thread.idea_id
      ? supabase.from("ideas").select("autor_id, wyslany_at").eq("id", thread.idea_id).maybeSingle()
      : Promise.resolve({ data: null }),
    thread.idea_id
      ? supabase
          .from("idea_reviews")
          .select("status, created_at")
          .eq("idea_id", thread.idea_id)
          .order("created_at")
      : Promise.resolve({ data: [] as { status: string; created_at: string }[] }),
  ]);

  const history: StatusStep[] = [];
  if (idea.data?.wyslany_at) history.push({ status: "wyslany", at: idea.data.wyslany_at });
  for (const r of reviews.data ?? []) {
    const s = IdeaStatus.safeParse(r.status);
    if (s.success) history.push({ status: s.data, at: r.created_at });
  }

  return {
    id: thread.id,
    temat: thread.temat,
    idea_id: thread.idea_id,
    innowacja_id: thread.innowacja_id,
    last_message_at: thread.last_message_at,
    others: thread.thread_participants.filter((p) => p.user_id !== userId).map(displayName),
    idea_status: thread.idea_id
      ? ((history.at(-1)?.status as IdeaStatus | undefined) ?? "nowy")
      : null,
    i_am_author: idea.data?.autor_id === userId,
    history: history.length > 1 || thread.idea_id ? history : [],
    messages: (rows ?? []).map((m) => ({
      id: m.id,
      autor_id: m.autor_id,
      autor_nazwa: m.autor_nazwa,
      autor_rola: parseRole(m.autor_rola),
      tresc: m.tresc,
      created_at: m.created_at,
      mine: m.autor_id === userId,
    })),
  };
}

export type MessagingDeps = {
  supabase: Client;
  me: { id: string; role: Role; name: string };
  addNotification: (n: NewNotification) => Promise<unknown>;
  sendEmail: (m: EmailMessage) => Promise<EmailResult>;
  ropsInbox?: string;
  siteUrl: string;
};

/**
 * After a message: notify everyone else in the thread live, plus all of ROPS when the writer is
 * not ROPS; e-mail the author when ROPS or an expert answered, or the ROPS inbox otherwise.
 * Best effort: failures are logged and never undo the message.
 */
export async function announceMessage(
  deps: MessagingDeps,
  threadId: string,
  temat: string,
  tresc: string,
) {
  const link = `/my/messages?thread=${threadId}`;
  const { data: participants } = await deps.supabase
    .from("thread_participants")
    .select("user_id")
    .eq("thread_id", threadId);
  const others = (participants ?? []).map((p) => p.user_id).filter((id) => id !== deps.me.id);
  const fromRops = isRops(deps.me.role);
  const tytul = `${deps.me.name}: nowa wiadomość w rozmowie „${temat}”`;

  const jobs: Promise<unknown>[] = [];
  if (others.length || !fromRops) {
    jobs.push(
      deps.addNotification({
        typ: "wiadomosc",
        tytul,
        link,
        ...(others.length ? { userIds: others } : {}),
        ...(!fromRops ? { role: ["rops_redaktor", "rops_admin"] } : {}),
      }),
    );
  }

  const excerpt = tresc.length > 400 ? `${tresc.slice(0, 400)}…` : tresc;
  const email = (to: string) =>
    deps.sendEmail({
      to,
      subject: `Nowa wiadomość: ${temat}`,
      heading: `${deps.me.name} odpisał(a) w rozmowie „${temat}”`,
      paragraphs: [excerpt],
      action: { label: "Odpowiedz", url: `${deps.siteUrl}${link}` },
    });
  if (fromRops || deps.me.role === "ekspert") {
    const { data: recipients } = await deps.supabase.rpc("thread_reply_emails", {
      p_thread_id: threadId,
    });
    for (const r of recipients ?? []) if (r.email) jobs.push(email(r.email));
  } else if (deps.ropsInbox) {
    jobs.push(email(deps.ropsInbox));
  }

  for (const r of await Promise.allSettled(jobs)) {
    if (r.status === "rejected") console.error("message side effect failed", r.reason);
  }
}

export type SendResult = { ok: true; threadId: string } | { ok: false; message: string };

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length === 0 || t.length > max ? null : t;
}

/** Reply in an existing thread. */
export async function sendReply(
  deps: MessagingDeps,
  threadId: string,
  rawText: unknown,
): Promise<SendResult> {
  const tresc = cleanText(rawText, 5000);
  if (!tresc) return { ok: false, message: "Napisz wiadomość (do 5000 znaków)." };
  const { data: thread } = await deps.supabase
    .from("threads")
    .select("temat")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) return { ok: false, message: "Nie znaleziono tej rozmowy." };
  const { error } = await deps.supabase.rpc("post_message", {
    p_thread_id: threadId,
    p_tresc: tresc,
  });
  if (error) return { ok: false, message: "Nie udało się wysłać wiadomości. Spróbuj ponownie." };
  await announceMessage(deps, threadId, thread.temat, tresc);
  return { ok: true, threadId };
}

/** New conversation with ROPS (optionally about an idea or an innovation). */
export async function startConversation(
  deps: MessagingDeps,
  input: {
    temat: unknown;
    tresc: unknown;
    ideaId?: string | null;
    innowacjaId?: string | null;
    participants?: string[];
  },
  options: { announce?: boolean } = {},
): Promise<SendResult> {
  const temat = cleanText(input.temat, 200);
  const tresc = cleanText(input.tresc, 5000);
  if (!temat) return { ok: false, message: "Napisz temat (do 200 znaków)." };
  if (!tresc) return { ok: false, message: "Napisz wiadomość (do 5000 znaków)." };
  const { data, error } = await deps.supabase.rpc("start_thread", {
    p_temat: temat,
    p_tresc: tresc,
    p_idea_id: input.ideaId ?? undefined,
    p_innowacja_id: input.innowacjaId ?? undefined,
    p_uczestnicy: input.participants?.length ? input.participants : undefined,
  });
  if (error || !data)
    return { ok: false, message: "Nie udało się wysłać wiadomości. Spróbuj ponownie." };
  if (options.announce !== false) await announceMessage(deps, data, temat, tresc);
  return { ok: true, threadId: data };
}
