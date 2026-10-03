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

const YEAR = new Intl.DateTimeFormat("pl-PL", { year: "numeric", timeZone: "Europe/Warsaw" });

/** Day of a message in words: "dziś", "wczoraj", "3 października" (+ year when not this year). */
export function day(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (DAY.format(d) === DAY.format(now)) return "dziś";
  if (DAY.format(d) === DAY.format(new Date(now.getTime() - 86400000))) return "wczoraj";
  const date = DATE.format(d);
  return YEAR.format(d) === YEAR.format(now) ? date : `${date} ${YEAR.format(d)}`;
}

/**
 * Message time with its day, so a conversation over several days is clear (WCAG 1.3.1):
 * "dziś, 14:05", "wczoraj, 16:42", "3 października, 09:12".
 */
export function stamp(iso: string, now = new Date()): string {
  return `${day(iso, now)}, ${time(iso)}`;
}

const STEP_LABELS: Record<string, string> = {
  wyslany: "wysłany",
  wyslany_ponownie: "wysłany ponownie",
};

// "wysłany 16:42 → w weryfikacji 16:50 → do poprawy 17:05" (design/makiety/Wiadomosci.dc.html).
// The day is added to the first step and whenever it changes: "wysłany wczoraj, 16:42 → …".
export function historyLine(steps: StatusStep[], now = new Date()): string {
  let previousDay: string | null = null;
  return steps
    .map((s) => {
      const label =
        STEP_LABELS[s.status] ??
        STATUS_LABELS[s.status as keyof typeof STATUS_LABELS].toLowerCase();
      const stepDay = day(s.at, now);
      const when = stepDay === previousDay ? time(s.at) : stamp(s.at, now);
      previousDay = stepDay;
      return `${label} ${when}`;
    })
    .join(" → ");
}

const PREFILL_PARAMS = ["innovation", "idea", "topic", "text"] as const;

/**
 * /my/messages?innovation=… (e.g. "Zapytaj ROPS" in the Library) means "write a new message".
 * Returns the matching /my/messages/new link, or null when the list should be shown.
 */
export function newMessageHref(
  params: Record<string, string | string[] | undefined>,
): string | null {
  if (typeof params.thread === "string" && params.thread) return null;
  const query = new URLSearchParams();
  for (const key of PREFILL_PARAMS) {
    const value = params[key];
    if (typeof value === "string" && value) query.set(key, value);
  }
  return query.size ? `/my/messages/new?${query}` : null;
}
