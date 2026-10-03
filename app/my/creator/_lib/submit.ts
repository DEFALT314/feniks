import type { AuditEntry } from "@/lib/audit";
import type { NewNotification } from "@/lib/contracts/notifications";
import type { MyIdea } from "./ideas";
import { canSubmit, missingForSubmission } from "./submission";

export type SubmitState =
  | { status: "idle" }
  | { status: "sent"; resent: boolean }
  | { status: "error"; message: string; missing?: string[] };

export type SubmitDeps = {
  loadIdea: (id: string) => Promise<MyIdea | null>;
  markSent: (id: string) => Promise<boolean>;
  addNotification: (n: NewNotification) => Promise<unknown>;
  writeAudit: (e: AuditEntry) => Promise<unknown>;
};

const ROPS_ROLES = ["rops_redaktor", "rops_admin"] as const;

/**
 * "Wyślij do ROPS" (#35): checks the card is complete and may be sent, sets wyslany_at,
 * notifies ROPS and writes the audit log. A failed notification or audit entry does not undo the
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

  const resent = idea.wyslany_at !== null;
  if (!(await deps.markSent(idea.id))) {
    return { status: "error", message: "Nie udało się wysłać pomysłu. Spróbuj ponownie." };
  }

  const followUps = await Promise.allSettled([
    deps.addNotification({
      role: [...ROPS_ROLES],
      typ: "pomysl_wyslany",
      tytul: `${resent ? "Poprawiony pomysł" : "Nowy pomysł"} do oceny: ${idea.tytul}`.slice(
        0,
        200,
      ),
      link: `/admin?idea=${idea.id}`,
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
