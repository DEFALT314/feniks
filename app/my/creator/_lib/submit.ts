import type { AuditEntry } from "@/lib/audit";
import type { MyIdea, SendResult } from "./ideas";
import type { ConsentState } from "./publication";
import { canSubmit, missingForSubmission } from "./submission";

export type SubmitState =
  | { status: "idle" }
  | { status: "sent"; resent: boolean }
  | { status: "error"; message: string; missing?: string[] };

export type SubmitDeps = {
  loadIdea: (id: string) => Promise<MyIdea | null>;
  send: (id: string) => Promise<SendResult>;
  // P4's notifyIdeaSent(): a notification for every ROPS user and an e-mail to the ROPS inbox
  notifyRops: (idea: { ideaId: string; tytul: string }) => Promise<unknown>;
  writeAudit: (e: AuditEntry) => Promise<unknown>;
  // Consent to show the idea as a good practice (#104), ticked in the send form
  changeConsent: (idea: { id: string; tytul: string }, agree: boolean) => Promise<ConsentState>;
};

const SEND_FAILED: Record<Exclude<SendResult, { ok: true }>["reason"], string> = {
  "not-found": "Nie ma takiego pomysłu albo nie jest Twój.",
  "with-rops": "Ten pomysł jest już w ROPS. Poczekaj na odpowiedź.",
  incomplete: "Uzupełnij fiszkę przed wysłaniem.",
  failed: "Nie udało się wysłać pomysłu. Spróbuj ponownie.",
};

/**
 * "Wyślij do ROPS" (#35): checks the card is complete and may be sent (for a clear message), then
 * the database sends it (public.wyslij_pomysl checks again under a row lock), and ROPS is notified
 * and the audit log written. A failed notification or audit entry does not undo the
 * submission: the idea is in the ROPS queue either way.
 *
 * `consent` is the "show it to others" box in the send form (#104): when it differs from the saved
 * choice it is saved first, and a failure stops the send, so the author is never surprised later.
 */
export async function submitIdea(
  deps: SubmitDeps,
  ideaId: string,
  consent?: boolean,
): Promise<SubmitState> {
  const idea = await deps.loadIdea(ideaId);
  if (!idea) return { status: "error", message: "Nie ma takiego pomysłu albo nie jest Twój." };

  if (!canSubmit(idea.wyslany_at, idea.status)) {
    return { status: "error", message: "Ten pomysł jest już w ROPS. Poczekaj na odpowiedź." };
  }
  const missing = missingForSubmission(idea);
  if (missing.length) {
    return { status: "error", message: "Uzupełnij fiszkę przed wysłaniem.", missing };
  }

  if (consent !== undefined && consent !== Boolean(idea.zgoda_publikacji_at)) {
    const saved = await deps.changeConsent({ id: idea.id, tytul: idea.tytul }, consent);
    if (saved.status === "error") return saved;
  }

  const sent = await deps.send(idea.id);
  if (!sent.ok) return { status: "error", message: SEND_FAILED[sent.reason] };
  const { resent } = sent;

  const followUps = await Promise.allSettled([
    deps.notifyRops({
      ideaId: idea.id,
      tytul: resent ? `${idea.tytul} (poprawiona wersja)` : idea.tytul,
    }),
    deps.writeAudit({
      akcja: resent ? "pomysl.ponowne_wyslanie" : "pomysl.wyslanie",
      obiekt: `ideas:${idea.id}`,
      szczegoly: { tytul: idea.tytul },
    }),
  ]);
  for (const result of followUps) {
    if (result.status === "rejected")
      console.error("Idea submitted, follow-up failed:", result.reason);
  }
  return { status: "sent", resent };
}
