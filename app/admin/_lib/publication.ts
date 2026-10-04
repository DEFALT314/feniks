import type { AuditEntry } from "@/lib/audit";
import type { NewNotification } from "@/lib/contracts/notifications";

// "Pokaż jako dobrą praktykę" (#104): ROPS shows an approved idea in the Library, when its author
// agreed. The checks live in public.opublikuj_pomysl() (migration *_creator_good_practices.sql).

/** Result of public.opublikuj_pomysl(), with its error codes mapped to reasons. */
export type PublishResult =
  | { ok: true; result: "opublikowany" | "ukryty" | "bez_zmian" }
  | { ok: false; reason: "no-consent" | "not-approved" | "not-rops" | "not-found" | "failed" };

export type PublishState =
  | { status: "idle" }
  | { status: "saved"; published: boolean; message: string }
  | { status: "error"; message: string };

export type PublishDeps = {
  loadIdea: (id: string) => Promise<{ id: string; tytul: string; autor_id: string } | null>;
  publish: (id: string, publish: boolean) => Promise<PublishResult>;
  writeAudit: (entry: AuditEntry) => Promise<unknown>;
  addNotification: (n: NewNotification) => Promise<unknown>;
};

export const PUBLISH_ERRORS: Record<string, Extract<PublishResult, { ok: false }>["reason"]> = {
  HM403: "not-rops",
  HM404: "not-found",
  HM409: "no-consent",
  HM422: "not-approved",
};

const REFUSED: Record<Extract<PublishResult, { ok: false }>["reason"], string> = {
  "no-consent": "Autor nie zgodził się na pokazanie tego pomysłu innym.",
  "not-approved": "Najpierw zatwierdź pomysł. Pokazać można tylko zatwierdzony pomysł.",
  "not-rops": "Tylko pracownicy ROPS mogą pokazywać dobre praktyki.",
  "not-found": "Nie znaleziono tego pomysłu.",
  failed: "Nie udało się zapisać zmiany. Spróbuj ponownie.",
};

/**
 * Shows (publish = true) or hides an idea as a good practice, then writes the audit log and tells
 * the author. Repeating the same choice changes nothing and notifies no one.
 */
export async function setGoodPractice(
  deps: PublishDeps,
  ideaId: string,
  publish: boolean,
): Promise<PublishState> {
  const idea = await deps.loadIdea(ideaId);
  if (!idea) return { status: "error", message: REFUSED["not-found"] };

  const saved = await deps.publish(idea.id, publish);
  if (!saved.ok) return { status: "error", message: REFUSED[saved.reason] };

  const message = publish
    ? `„${idea.tytul}” jest w Bibliotece jako dobra praktyka.`
    : `„${idea.tytul}” nie jest już pokazywany w Bibliotece.`;
  if (saved.result === "bez_zmian") return { status: "saved", published: publish, message };

  const shown = saved.result === "opublikowany";
  const followUps = await Promise.allSettled([
    deps.writeAudit({
      akcja: shown ? "pomysl.publikacja" : "pomysl.publikacja_wycofana",
      obiekt: `ideas:${idea.id}`,
      szczegoly: { tytul: idea.tytul },
    }),
    deps.addNotification(
      shown
        ? {
            userIds: [idea.autor_id],
            typ: "pomysl_opublikowany",
            tytul: `ROPS pokazuje Twój pomysł „${idea.tytul}” w Bibliotece jako dobrą praktykę.`,
            link: `/library/good-practices/${idea.id}`,
          }
        : {
            userIds: [idea.autor_id],
            typ: "pomysl_ukryty",
            tytul: `ROPS przestał pokazywać Twój pomysł „${idea.tytul}” w Bibliotece.`,
            link: `/my/creator/${idea.id}/card`,
          },
    ),
  ]);
  for (const result of followUps) {
    if (result.status === "rejected")
      console.error("Publication saved, follow-up failed:", result.reason);
  }
  return { status: "saved", published: shown, message };
}
