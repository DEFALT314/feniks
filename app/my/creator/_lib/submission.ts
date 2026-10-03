import type { IdeaStatus } from "@/lib/contracts/admin";
import type { IdeaDraft } from "@/lib/contracts/ai";
import type { Idea } from "@/lib/contracts/idea-creator";

// Card fields ROPS needs to assess an idea (design/makiety/Fiszka.dc.html)
const REQUIRED: { key: "tytul" | "opis" | "istota" | "dla_kogo"; label: string }[] = [
  { key: "tytul", label: "Tytuł" },
  { key: "opis", label: "Opis" },
  { key: "istota", label: "Istota" },
  { key: "dla_kogo", label: "Dla kogo" },
];

type CardFields = Pick<Idea, "tytul" | "opis" | "istota" | "dla_kogo" | "etap">;

/** Labels of the required card fields that are still empty. */
export function missingForSubmission(card: CardFields): string[] {
  return REQUIRED.filter(({ key }) => !card[key]?.trim()).map(({ label }) => label);
}

/**
 * The ROPS review that applies to the version ROPS has now. After the author sends a corrected
 * version, the earlier review (e.g. "do_poprawy") is about the old version, so it no longer applies.
 */
export function currentReview<R extends { oceniony_at: string | null }>(
  sentAt: string | null,
  review: R | undefined,
): R | undefined {
  if (!review || !sentAt || !review.oceniony_at) return review;
  return Date.parse(review.oceniony_at) >= Date.parse(sentAt) ? review : undefined;
}

/**
 * The author sends an idea once; after ROPS asks for changes ("do_poprawy") they may send it again.
 * status is the latest ROPS review, or null when there is none.
 */
export function canSubmit(sentAt: string | null, status: IdeaStatus | null): boolean {
  return sentAt === null || status === "do_poprawy";
}

// What the author sees on "Moje pomysły" and the card (ROPS's own labels are in app/admin/_lib/status.ts)
export type AuthorStatus = {
  label: string;
  badge: "neutral" | "ai" | "warning" | "success" | "danger";
};

export function authorStatus(sentAt: string | null, status: IdeaStatus | null): AuthorStatus {
  if (!sentAt) return { label: "Szkic", badge: "neutral" };
  switch (status) {
    case "w_weryfikacji":
      return { label: "ROPS sprawdza pomysł", badge: "warning" };
    case "zatwierdzony":
      return { label: "Zatwierdzony przez ROPS", badge: "success" };
    case "do_poprawy":
      return { label: "Do poprawy", badge: "danger" };
    case "odrzucony":
      return { label: "Odrzucony", badge: "danger" };
    default:
      return { label: "Wysłany do ROPS", badge: "ai" };
  }
}

/** The card as P3's AI endpoints expect it (lib/contracts/ai.ts IdeaDraft). */
export function toIdeaDraft(card: CardFields & Pick<Idea, "obszar_id">): IdeaDraft {
  const optional = (value: string | null) => (value?.trim() ? value.trim() : undefined);
  return {
    title: card.tytul.trim(),
    description: card.opis?.trim() ?? "",
    essence: optional(card.istota),
    audience: optional(card.dla_kogo),
    stage: card.etap ?? undefined,
    area_id: card.obszar_id ?? undefined,
  };
}

/** Text for "Coś podobnego już działa": the card's own words, as the match endpoint needs them. */
export function matchDescription(card: CardFields): string {
  return [card.opis, card.istota, card.dla_kogo]
    .map((part) => part?.trim().replace(/[.!?\s]+$/, ""))
    .filter(Boolean)
    .join(". ")
    .slice(0, 2000);
}
