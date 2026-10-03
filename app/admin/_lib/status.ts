import type { IdeaStatus } from "@/lib/contracts/admin";

// Labels and badge colors from design/makiety/Admin.dc.html.
export const STATUS_LABELS: Record<IdeaStatus, string> = {
  nowy: "Nowy",
  w_weryfikacji: "W weryfikacji",
  zatwierdzony: "Zatwierdzony",
  do_poprawy: "Do poprawy",
  odrzucony: "Odrzucony",
};

export const STATUS_BADGE: Record<IdeaStatus, "neutral" | "warning" | "success" | "danger"> = {
  nowy: "neutral",
  w_weryfikacji: "warning",
  zatwierdzony: "success",
  do_poprawy: "danger",
  odrzucony: "danger",
};

// Ideas that still need a decision come first in the queue.
export const OPEN_STATUSES: readonly IdeaStatus[] = ["nowy", "w_weryfikacji"];

export function parseStatusFilter(value: unknown): IdeaStatus | "open" | "all" {
  if (value === "all") return "all";
  if (typeof value === "string" && value in STATUS_LABELS) return value as IdeaStatus;
  return "open";
}
