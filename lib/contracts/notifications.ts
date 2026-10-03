import { z } from "zod";
import fixture from "./fixtures/notifications.json";
import { Role } from "./shared";

// Module V: notifications (P4). Table public.notifications.
// GET  /api/notifications             → NotificationList (own, latest 50)
// POST /api/notifications/read { ids?: uuid[] } → { ok: true } (no ids: all)
// Other modules add notifications with addNotification() from lib/notifications.ts.

export const Notification = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  typ: z.string(),
  tytul: z.string(),
  link: z.string().nullable(),
  przeczytane: z.boolean(),
  created_at: z.iso.datetime({ offset: true }),
});
export type Notification = z.infer<typeof Notification>;

export const NotificationList = z.object({
  powiadomienia: z.array(Notification),
  nieprzeczytane: z.number().int().nonnegative(),
});
export type NotificationList = z.infer<typeof NotificationList>;

export const MarkReadInput = z.object({
  ids: z.array(z.uuid()).optional(),
});
export type MarkReadInput = z.infer<typeof MarkReadInput>;

// Input of addNotification(): at least one recipient (userIds or role).
export const NewNotification = z
  .object({
    typ: z.string().min(1).max(50),
    tytul: z.string().min(1).max(200),
    link: z.string().startsWith("/").optional(),
    userIds: z.array(z.uuid()).optional(),
    role: z.array(Role).optional(),
  })
  .refine((n) => (n.userIds?.length ?? 0) + (n.role?.length ?? 0) > 0, {
    message: "Recipients required: userIds or role",
  });
export type NewNotification = z.infer<typeof NewNotification>;

export const notificationListFixture: NotificationList = NotificationList.parse(fixture);
