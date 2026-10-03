// Dates and audit entries in plain Polish for the panel.
const TIME = new Intl.DateTimeFormat("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Warsaw",
});
const DATE = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Warsaw",
});
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" });

export function formatSentAt(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const day = DAY.format(date);
  if (day === DAY.format(now)) return `dziś ${TIME.format(date)}`;
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (day === DAY.format(yesterday)) return `wczoraj ${TIME.format(date)}`;
  return DATE.format(date);
}

export function formatTime(iso: string): string {
  return TIME.format(new Date(iso));
}

const STATUS_WORDS: Record<string, string> = {
  zatwierdzony: "zatwierdzony",
  do_poprawy: "do poprawy",
  odrzucony: "odrzucony",
  w_weryfikacji: "przekazano ekspertowi",
};

export function describeAudit(akcja: string, szczegoly: unknown): string {
  const d = (szczegoly ?? {}) as Record<string, unknown>;
  if (akcja === "pomysl.ocena") {
    const status = STATUS_WORDS[String(d.status)] ?? String(d.status);
    return `status „${status}”: ${String(d.tytul ?? "pomysł")}`;
  }
  return akcja;
}
