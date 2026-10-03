import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/types";
import {
  announceMessage,
  currentStatus,
  sendReply,
  startConversation,
  statusHistory,
  type MessagingDeps,
} from "./messaging";

type Role = MessagingDeps["me"]["role"];

function deps(
  opts: { role?: Role; participants?: string[]; emails?: string[]; rpcError?: boolean } = {},
) {
  const rpc = vi.fn(async (fn: string) => {
    if (opts.rpcError) return { data: null, error: { message: "denied" } };
    if (fn === "thread_reply_emails")
      return { data: (opts.emails ?? []).map((email) => ({ email })), error: null };
    if (fn === "start_thread") return { data: "t-new", error: null };
    return { data: "m1", error: null };
  });
  const from = vi.fn((table: string) => {
    const q: Record<string, unknown> = {};
    q.select = vi.fn(() => q);
    q.eq = vi.fn(() =>
      table === "thread_participants"
        ? Promise.resolve({
            data: (opts.participants ?? ["me", "author"]).map((user_id) => ({ user_id })),
          })
        : q,
    );
    q.maybeSingle = vi.fn(async () => ({ data: { temat: "Kawiarenka" } }));
    return q;
  });
  const d: MessagingDeps = {
    supabase: { rpc, from } as unknown as SupabaseClient<Database>,
    me: { id: "me", role: opts.role ?? "rops_redaktor", name: "Redakcja ROPS" },
    addNotification: vi.fn(async () => 1),
    sendEmail: vi.fn(async () => ({ sent: true as const, id: "e" })),
    ropsInbox: "rops@hubmi.pl",
    siteUrl: "https://hubmi.pl",
  };
  return { d, rpc };
}

describe("announceMessage", () => {
  it("ROPS reply: notifies the others and e-mails the author", async () => {
    const { d } = deps({ emails: ["anna@gmail.com"] });

    await announceMessage(d, "t1", "Kawiarenka", "Prosimy o poprawki");

    expect(d.addNotification).toHaveBeenCalledWith({
      typ: "wiadomosc",
      tytul: "Redakcja ROPS: nowa wiadomość w rozmowie „Kawiarenka”",
      link: "/my/messages?thread=t1",
      userIds: ["author"],
    });
    expect(d.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "anna@gmail.com",
        action: { label: "Odpowiedz", url: "https://hubmi.pl/my/messages?thread=t1" },
      }),
    );
  });

  it("author message: notifies all of ROPS and e-mails the ROPS inbox, not people", async () => {
    const { d, rpc } = deps({ role: "mieszkaniec", participants: ["me"] });
    d.me.name = "Stanisław";

    await announceMessage(d, "t1", "Pytanie", "Kiedy nabór?");

    expect(d.addNotification).toHaveBeenCalledWith(
      expect.objectContaining({ role: ["rops_redaktor", "rops_admin"] }),
    );
    expect(rpc).not.toHaveBeenCalledWith("thread_reply_emails", expect.anything());
    expect(d.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "rops@hubmi.pl" }));
  });

  it("shortens long messages in the e-mail", async () => {
    const { d } = deps({ emails: ["a@gmail.com"] });
    await announceMessage(d, "t1", "T", "x".repeat(600));
    const mail = (d.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(mail.paragraphs[0]).toHaveLength(401);
  });
});

describe("sendReply / startConversation", () => {
  it("validates the text before calling the database", async () => {
    const { d, rpc } = deps();
    expect(await sendReply(d, "t1", "   ")).toMatchObject({ ok: false });
    expect(await startConversation(d, { temat: "", tresc: "x" })).toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("posts a reply and announces it", async () => {
    const { d, rpc } = deps();
    expect(await sendReply(d, "t1", " Dziękujemy ")).toEqual({ ok: true, threadId: "t1" });
    expect(rpc).toHaveBeenCalledWith("post_message", { p_thread_id: "t1", p_tresc: "Dziękujemy" });
    expect(d.addNotification).toHaveBeenCalled();
  });

  it("starts a thread about an idea and returns its id", async () => {
    const { d, rpc } = deps();
    const r = await startConversation(d, { temat: "Kawiarenka", tresc: "Pytanie", ideaId: "i1" });
    expect(r).toEqual({ ok: true, threadId: "t-new" });
    expect(rpc).toHaveBeenCalledWith(
      "start_thread",
      expect.objectContaining({ p_temat: "Kawiarenka", p_idea_id: "i1", p_uczestnicy: undefined }),
    );
  });

  it("reports database refusals without announcing", async () => {
    const { d } = deps({ rpcError: true });
    expect(await sendReply(d, "t1", "hej")).toMatchObject({ ok: false });
    expect(d.addNotification).not.toHaveBeenCalled();
  });
});

describe("idea status after a resubmission", () => {
  it("treats a review older than the latest submission as stale (like the ROPS queue)", () => {
    expect(
      currentStatus("2026-10-03T16:00:00Z", {
        status: "do_poprawy",
        oceniony_at: "2026-10-03T15:30:00Z",
      }),
    ).toBe("nowy");
    expect(
      currentStatus("2026-10-03T15:00:00Z", {
        status: "do_poprawy",
        oceniony_at: "2026-10-03T15:30:00Z",
      }),
    ).toBe("do_poprawy");
    expect(currentStatus("2026-10-03T15:00:00Z", undefined)).toBe("nowy");
  });

  it("orders the history and shows a resubmission at the end", () => {
    const reviews = [
      { status: "do_poprawy", created_at: "2026-10-03T15:30:00Z" },
      { status: "w_weryfikacji", created_at: "2026-10-03T15:10:00Z" },
    ];
    expect(statusHistory("2026-10-03T15:00:00Z", reviews).map((s) => s.status)).toEqual([
      "wyslany",
      "w_weryfikacji",
      "do_poprawy",
    ]);
    expect(statusHistory("2026-10-03T16:00:00Z", reviews).map((s) => s.status)).toEqual([
      "w_weryfikacji",
      "do_poprawy",
      "wyslany_ponownie",
    ]);
  });
});
