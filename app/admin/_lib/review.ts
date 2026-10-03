import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditEntry } from "@/lib/audit";
import { ReviewIdeaInput } from "@/lib/contracts/admin";
import type { NewNotification } from "@/lib/contracts/notifications";
import type { EmailMessage, EmailResult } from "@/lib/email";
import type { Database } from "@/lib/supabase/types";
import { STATUS_LABELS } from "./status";

export type ReviewDeps = {
  supabase: SupabaseClient<Database>;
  writeAudit: (entry: AuditEntry) => Promise<unknown>;
  addNotification: (n: NewNotification) => Promise<unknown>;
  sendEmail: (m: EmailMessage) => Promise<EmailResult>;
  siteUrl: string;
};

export type ReviewState = {
  status: "idle" | "saved" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"komentarz" | "ekspert_id" | "status", string>>;
  emailSent?: boolean;
};

const AUTHOR_MESSAGES: Record<string, (title: string) => string> = {
  zatwierdzony: (t) => `ROPS zatwierdził Twój pomysł „${t}”.`,
  do_poprawy: (t) => `ROPS prosi o poprawki w pomyśle „${t}”.`,
  odrzucony: (t) => `ROPS nie przyjął pomysłu „${t}”.`,
  w_weryfikacji: (t) => `Twój pomysł „${t}” trafił do eksperta.`,
};

/**
 * Saves a ROPS decision on an idea: a new idea_reviews row, an audit entry, an in-app notification
 * for the author (and the expert, if assigned) and an e-mail to the author. The e-mail is best effort.
 */
export async function reviewIdea(
  deps: ReviewDeps,
  ideaId: string,
  fields: Record<string, FormDataEntryValue | null>,
): Promise<ReviewState> {
  const parsed = ReviewIdeaInput.safeParse({
    status: fields.status,
    komentarz:
      typeof fields.komentarz === "string" && fields.komentarz.trim()
        ? fields.komentarz
        : undefined,
    ekspert_id:
      typeof fields.ekspert_id === "string" && fields.ekspert_id ? fields.ekspert_id : undefined,
  });
  if (!parsed.success) {
    const fieldErrors: ReviewState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if ((key === "komentarz" || key === "ekspert_id" || key === "status") && !fieldErrors[key]) {
        fieldErrors[key] = key === "status" ? "Wybierz decyzję." : issue.message;
      }
    }
    return { status: "error", fieldErrors };
  }
  const review = parsed.data;

  const { data: idea } = await deps.supabase
    .from("ideas")
    .select("id, tytul, autor_id")
    .eq("id", ideaId)
    .not("wyslany_at", "is", null)
    .maybeSingle();
  if (!idea) return { status: "error", message: "Nie znaleziono tego pomysłu." };

  const { error } = await deps.supabase.from("idea_reviews").insert({
    idea_id: idea.id,
    status: review.status,
    komentarz: review.komentarz ?? null,
    ekspert_id: review.ekspert_id ?? null,
  });
  if (error) return { status: "error", message: "Nie udało się zapisać oceny. Spróbuj ponownie." };

  const statusLabel = STATUS_LABELS[review.status];
  const headline = AUTHOR_MESSAGES[review.status](idea.tytul);
  const authorLink = `/my/creator/${idea.id}`;

  // Side effects must not undo a saved decision: log failures and carry on.
  const results = await Promise.allSettled([
    deps.writeAudit({
      akcja: "pomysl.ocena",
      obiekt: `ideas:${idea.id}`,
      szczegoly: {
        status: review.status,
        ekspert_id: review.ekspert_id ?? null,
        tytul: idea.tytul,
      },
    }),
    deps.addNotification({
      userIds: [idea.autor_id],
      typ: "pomysl_oceniony",
      tytul: headline,
      link: authorLink,
    }),
    review.ekspert_id
      ? deps.addNotification({
          userIds: [review.ekspert_id],
          typ: "pomysl_przekazany",
          tytul: `ROPS przekazał Ci pomysł „${idea.tytul}” do konsultacji.`,
          link: "/my/messages",
        })
      : Promise.resolve(),
  ]);
  for (const r of results)
    if (r.status === "rejected") console.error("review side effect failed", r.reason);

  let emailSent = false;
  const { data: email } = await deps.supabase.rpc("idea_author_email", { p_idea_id: idea.id });
  if (typeof email === "string" && email) {
    const sent = await deps.sendEmail({
      to: email,
      subject: `${statusLabel}: ${idea.tytul}`,
      heading: headline,
      paragraphs: [
        `Status: ${statusLabel.toLowerCase()}.`,
        ...(review.komentarz ? [`Wiadomość od ROPS: ${review.komentarz}`] : []),
      ],
      action: { label: "Zobacz pomysł", url: `${deps.siteUrl}${authorLink}` },
    });
    emailSent = sent.sent;
  }

  return { status: "saved", message: `Zapisano: ${statusLabel.toLowerCase()}.`, emailSent };
}
