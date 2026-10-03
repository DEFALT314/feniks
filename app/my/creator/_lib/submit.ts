import type { AuditEntry } from "@/lib/audit";
import type { MyIdea, SendResult } from "./ideas";
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
 */
export async function submitIdea(deps: SubmitDeps, ideaId: string): Promise<SubmitState> {
  const idea = await deps.loadIdea(ideaId);
  if (!idea) return { status: "error", message: "Nie ma takiego pomysłu albo nie jest Twój." };

  if (!canSubmit(idea.wyslany_at, idea.status)) {
    return { status: "error", message: "Ten pomysł jest już w ROPS. Poczekaj na odpowiedź." };
  }
  const missing = missingForSubmission(idea);
  if (missing.length) {
    return { status: "error", message: "Uzupełnij fiszkę przed wysłaniem.", missing };
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
    }),
  ]);
  for (const result of followUps) {
    if (result.status === "rejected")
      console.error("Idea submitted, follow-up failed:", result.reason);
  }
  return { status: "sent", resent };
}
