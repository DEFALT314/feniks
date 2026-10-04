import type { AuditEntry } from "@/lib/audit";
import type { Idea } from "@/lib/contracts/idea-creator";

// Good practices (#104): the author agrees to show the idea card to everyone, ROPS decides to show
// it. The database keeps both (migration *_creator_good_practices.sql); this is what the app does
// around it.

type PublicationFields = Partial<Pick<Idea, "zgoda_publikacji_at" | "opublikowany_at">>;

export type PublicationView =
  | { kind: "published"; since: string } // in the Library now
  | { kind: "consent" } // the author agreed; ROPS has not shown it (yet)
  | { kind: "no-consent" }; // only ROPS and experts see it

export function publicationView(idea: PublicationFields): PublicationView {
  if (!idea.zgoda_publikacji_at) return { kind: "no-consent" };
  if (idea.opublikowany_at) return { kind: "published", since: idea.opublikowany_at };
  return { kind: "consent" };
}

/** Result of public.ustaw_zgode_publikacji(); "ukryty" = the withdrawal took a practice down. */
export type ConsentResult =
  | { ok: true; result: "zgoda" | "brak_zgody" | "ukryty" }
  | { ok: false; reason: "not-found" | "failed" };

export type ConsentState =
  | { status: "idle" }
  | { status: "saved"; consent: boolean; message: string }
  | { status: "error"; message: string };

export type ConsentDeps = {
  setConsent: (ideaId: string, agree: boolean) => Promise<ConsentResult>;
  // Tells ROPS that a practice they showed is gone from the Library
  notifyRops: (idea: { id: string; tytul: string }) => Promise<unknown>;
  writeAudit: (entry: AuditEntry) => Promise<unknown>;
};

const SAVED: Record<Extract<ConsentResult, { ok: true }>["result"], string> = {
  zgoda:
    "Zapisaliśmy zgodę. Jeśli ROPS zatwierdzi pomysł, może pokazać go w Bibliotece jako dobrą praktykę.",
  brak_zgody: "Wycofaliśmy zgodę. Pomysł widzą tylko ROPS i eksperci.",
  ukryty: "Wycofaliśmy zgodę. Pomysł zniknął z Biblioteki.",
};

const REFUSED: Record<Extract<ConsentResult, { ok: false }>["reason"], string> = {
  "not-found": "Nie ma takiego pomysłu albo nie jest Twój.",
  failed: "Nie udało się zapisać zgody. Spróbuj ponownie.",
};

/**
 * Gives or withdraws the author's consent. The audit log keeps every change (it is a consent
 * record). A failed follow-up does not undo the choice: the database already applied it.
 */
export async function changeConsent(
  deps: ConsentDeps,
  idea: { id: string; tytul: string },
  agree: boolean,
): Promise<ConsentState> {
  const saved = await deps.setConsent(idea.id, agree);
  if (!saved.ok) return { status: "error", message: REFUSED[saved.reason] };

  const followUps = await Promise.allSettled([
    deps.writeAudit({
      akcja: agree ? "pomysl.zgoda_publikacji" : "pomysl.zgoda_wycofana",
      obiekt: `ideas:${idea.id}`,
      szczegoly: { tytul: idea.tytul },
    }),
    saved.result === "ukryty" ? deps.notifyRops(idea) : Promise.resolve(),
  ]);
  for (const result of followUps) {
    if (result.status === "rejected")
      console.error("Consent saved, follow-up failed:", result.reason);
  }
  return { status: "saved", consent: agree, message: SAVED[saved.result] };
}
