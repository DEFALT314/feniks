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

// Plain words for the other audit codes, so staff never see raw codes such as "nabor.wlaczenie"
const AUDIT_WORDS: Record<string, string> = {
  "pomysl.wyslanie": "nowy pomysł",
  "pomysl.ponowne_wyslanie": "poprawiony pomysł",
  "innowacja.edycja": "zmieniono kartę innowacji",
  "nabor.dodanie": "dodano nabór",
  "nabor.edycja": "zmieniono nabór",
  "nabor.wlaczenie": "włączono nabór",
  "nabor.wylaczenie": "wyłączono nabór",
  "profil.rola.zatwierdzona": "zatwierdzono rolę",
  "profil.rola.odrzucona": "odrzucono prośbę o rolę",
};

export function describeAudit(akcja: string, szczegoly: unknown): string {
  const d = (szczegoly ?? {}) as Record<string, unknown>;
  if (akcja === "pomysl.ocena") {
    const status = STATUS_WORDS[String(d.status)] ?? String(d.status);
    return `„${String(d.tytul ?? "pomysł")}”: ${status}`;
  }
  const label = AUDIT_WORDS[akcja] ?? "inna zmiana";
  const name = d.nazwa ?? d.tytul;
  return typeof name === "string" && name ? `${label}: ${name}` : label;
}

// Polish plural: 1 pomysł, 2–4 pomysły (but 12–14 pomysłów), 5+ pomysłów
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const tens = n % 100;
  const units = n % 10;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

/** Announced after a status filter change, e.g. "Do poprawy: 3 pomysły". */
export function filterSummary(label: string, count: number): string {
  return `${label}: ${count} ${plural(count, "pomysł", "pomysły", "pomysłów")}`;
}
