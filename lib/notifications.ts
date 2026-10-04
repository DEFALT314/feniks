import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NewNotification } from "@/lib/contracts/notifications";
import { sendEmail, siteUrl } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

/**
 * Adds a notification (header bell, Realtime). Call it from endpoints and Server Actions.
 * Recipients: `userIds` and/or everyone with `role`. The database checks permissions
 * (public.dodaj_powiadomienie): a regular user may notify themselves, ROPS and experts;
 * ROPS and experts may notify anyone. Returns the number of notifications created.
 *
 * @example
 * await addNotification({ role: ["rops_redaktor", "rops_admin"], typ: "pomysl_wyslany",
 *   tytul: "Nowy pomysł do oceny", link: `/admin?idea=${id}` });
 */
export async function addNotification(
  input: NewNotification,
  client?: SupabaseClient<Database>,
): Promise<number> {
  const n = NewNotification.parse(input);
  const supabase = client ?? (await createClient());

  const { data, error } = await supabase.rpc("dodaj_powiadomienie", {
    p_typ: n.typ,
    p_tytul: n.tytul,
    p_link: n.link,
    p_user_ids: n.userIds,
    p_role: n.role,
  });

  if (error) throw new Error(`Failed to add notification: ${error.message}`);
  return data as number;
}

/**
 * Call when an author sends an idea to ROPS ("Wyślij do ROPS", #35): every ROPS staff member gets
 * a notification in the app (live bell) and the shared ROPS inbox gets an e-mail. Use the author's
 * session client; the database allows anyone signed in to notify ROPS. The e-mail is best effort.
 *
 * @example
 * await notifyIdeaSent({ ideaId: idea.id, tytul: idea.tytul }, supabase);
 */
export async function notifyIdeaSent(
  idea: { ideaId: string; tytul: string; autorNazwa?: string | null },
  client?: SupabaseClient<Database>,
  deps: { sendEmail?: typeof sendEmail; env?: Record<string, string | undefined> } = {},
): Promise<{ notified: number; emailSent: boolean }> {
  const env = deps.env ?? process.env;
  const link = `/admin?idea=${idea.ideaId}`;
  const notified = await addNotification(
    {
      role: ["rops_redaktor", "rops_admin"],
      typ: "pomysl_wyslany",
      tytul: `Nowy pomysł do oceny: „${idea.tytul}”`,
      link,
    },
    client,
  );

  const inbox = env.ROPS_NOTIFY_EMAIL || env.SMTP_USER;
  let emailSent = false;
  if (inbox) {
    const result = await (deps.sendEmail ?? sendEmail)(
      {
        to: inbox,
        subject: `Nowy pomysł do oceny: ${idea.tytul}`,
        heading: "Nowy pomysł czeka na ocenę",
        paragraphs: [
          `„${idea.tytul}”${idea.autorNazwa ? `, autor: ${idea.autorNazwa}` : ""}.`,
          "Oceń go w Panelu ROPS: zatwierdź, poproś o poprawki albo przekaż ekspertowi.",
        ],
        action: { label: "Otwórz w Panelu ROPS", url: `${siteUrl(env)}${link}` },
      },
      env,
    );
    emailSent = result.sent;
  }
  return { notified, emailSent };
}
