import { z } from "zod";
import fixture from "./fixtures/messages.json";
import { Role } from "./shared";

// Module V: messages between ROPS, idea author and expert (P4).
// GET  /api/messages                   → Thread[] (threads I take part in)
// GET  /api/messages/[threadId]        → ThreadWithMessages
// POST /api/messages                   NewMessageInput → Message (new thread or reply)

export const Participant = z.object({
  user_id: z.uuid(),
  nazwa_wyswietlana: z.string().nullable(),
  role: Role,
});
export type Participant = z.infer<typeof Participant>;

export const Message = z.object({
  id: z.uuid(),
  thread_id: z.uuid(),
  autor_id: z.uuid(),
  autor_nazwa: z.string().nullable(),
  tresc: z.string(),
  created_at: z.iso.datetime({ offset: true }),
});
export type Message = z.infer<typeof Message>;

export const Thread = z.object({
  id: z.uuid(),
  temat: z.string(),
  idea_id: z.uuid().nullable(), // thread about an idea from the Idea creator
  uczestnicy: z.array(Participant),
  ostatnia_wiadomosc_at: z.iso.datetime({ offset: true }),
  nieprzeczytane: z.number().int().nonnegative(),
});
export type Thread = z.infer<typeof Thread>;

export const ThreadWithMessages = Thread.extend({
  wiadomosci: z.array(Message),
});
export type ThreadWithMessages = z.infer<typeof ThreadWithMessages>;

// thread_id → reply; no thread_id → new thread (temat required).
export const NewMessageInput = z
  .object({
    thread_id: z.uuid().optional(),
    temat: z.string().min(1).max(200).optional(),
    idea_id: z.uuid().optional(),
    odbiorcy: z.array(z.uuid()).optional(),
    tresc: z.string().min(1).max(5000),
  })
  .refine((m) => m.thread_id || m.temat, {
    message: "thread_id or temat of a new thread required",
  });
export type NewMessageInput = z.infer<typeof NewMessageInput>;

export const threadFixture: ThreadWithMessages = ThreadWithMessages.parse(fixture);
