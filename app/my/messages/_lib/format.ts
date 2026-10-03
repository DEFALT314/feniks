import type { StatusStep } from "@/lib/messaging";
import { STATUS_LABELS } from "@/app/admin/_lib/status";

const TIME = new Intl.DateTimeFormat("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Warsaw",
});
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" });
const DATE = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Warsaw",
});

export function when(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (DAY.format(d) === DAY.format(now)) return `dziś ${TIME.format(d)}`;
  if (DAY.format(d) === DAY.format(new Date(now.getTime() - 86400000))) return "wczoraj";
  return DATE.format(d);
}

export function time(iso: string): string {
  return TIME.format(new Date(iso));
}

// "wysłany 16:42 → w weryfikacji 16:50 → do poprawy 17:05" (design/makiety/Wiadomosci.dc.html)
export function historyLine(steps: StatusStep[]): string {
  return steps
    .map(
      (s) =>
        `${s.status === "wyslany" ? "wysłany" : STATUS_LABELS[s.status].toLowerCase()} ${time(s.at)}`,
    )
    .join(" → ");
}
