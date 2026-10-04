// Client-side logic of the /match page: request building and the two-phase fetch.
// Phase 1 asks for the ranking only (ai: false, well under a second); phase 2 asks again with AI
// for the picks and reasons (8–25 s on the free LLM tier, instant when cached).
import { MatchResponse, type MatchRequest } from "@/lib/contracts/match";

export const EXAMPLES = [
  "Samotni seniorzy na wsi z objawami depresji",
  "Bezdomni nie mają gdzie się umyć zimą",
  "Niewidomi petenci gubią się w urzędzie",
];

export const MIN_LENGTH = 10;
export const MAX_LENGTH = 2000;

export type FormValues = { description: string; municipality: string };

export function buildRequest(values: FormValues, ai: boolean): MatchRequest {
  const municipality = values.municipality.trim();
  return {
    description: values.description.trim(),
    ...(municipality ? { municipality } : {}),
    ai,
  };
}

// Validation before sending, in plain Polish (the server checks the same).
export function validate(description: string): string | null {
  const length = description.trim().length;
  if (length < MIN_LENGTH) return "Opisz problem trochę dokładniej: co najmniej 10 znaków.";
  if (length > MAX_LENGTH) return "Opis jest za długi: najwyżej 2000 znaków.";
  return null;
}

export type FetchResult = { ok: true; data: MatchResponse } | { ok: false; error: string };

export async function fetchMatch(
  request: MatchRequest,
  fetcher: typeof fetch = fetch,
): Promise<FetchResult> {
  try {
    const response = await fetcher("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        error: body?.error ?? "Wyszukiwanie nie zadziałało. Spróbuj ponownie za chwilę.",
      };
    }
    const parsed = MatchResponse.safeParse(body);
    return parsed.success
      ? { ok: true, data: parsed.data }
      : { ok: false, error: "Nie udało się odczytać wyniku. Spróbuj ponownie." };
  } catch {
    return { ok: false, error: "Brak połączenia. Sprawdź internet i spróbuj ponownie." };
  }
}

export type Phase = "idle" | "searching" | "choosing" | "done" | "error";

// Runs both phases and reports progress. `isCurrent` lets the caller drop answers to an older search.
export async function runTwoPhase(
  values: FormValues,
  report: (phase: Phase, data: MatchResponse | null, error: string | null) => void,
  isCurrent: () => boolean,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  report("searching", null, null);
  const fast = await fetchMatch(buildRequest(values, false), fetcher);
  if (!isCurrent()) return;
  if (!fast.ok) return report("error", null, fast.error);
  report("choosing", fast.data, null);

  const full = await fetchMatch(buildRequest(values, true), fetcher);
  if (!isCurrent()) return;
  // If the AI phase fails, keep the ranking: it is still a useful answer.
  report("done", full.ok ? full.data : fast.data, null);
}

// "Zgłoś potrzebę": opens the "Napisz do ROPS" form (P4, /my/messages/new) prefilled with the
// challenge as the topic and the description the user typed. The description is the redacted one
// from the response (no phone, e-mail, PESEL); nothing is sent until the user clicks "Wyślij".
export function reportNeedHref(result: MatchResponse): string {
  const c = result.challenge;
  const topic = c
    ? `Potrzeba: ${c.area_name}${c.challenge_text ? ` – ${c.challenge_text}` : ""}`
    : "Potrzeba bez gotowego rozwiązania";
  const text = result.description_segments.map((s) => s.text).join("");
  const params = new URLSearchParams({ topic: topic.slice(0, 200), text: text.slice(0, 5000) });
  return `/my/messages/new?${params}`;
}

// Polish plural forms: 1 propozycja, 2–4 propozycje, 5+ propozycji (12–14 take the last form).
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const tens = n % 100;
  const units = n % 10;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

// The one short sentence a screen reader hears when the result changes (WCAG 4.1.3). The result
// itself is not a live region, so 1,500 characters of cards are never read out at once.
export function resultAnnouncement(
  phase: Phase,
  data: MatchResponse | null,
  error: string | null,
): string | null {
  if (phase === "error") return error;
  if (phase === "searching") return "Szukam w Bibliotece ROPS…";
  if (!data) return null;
  const n = data.innovations.length;
  if (phase === "choosing") {
    const found = n
      ? `Znaleźliśmy ${n} ${plural(n, "wstępny wynik", "wstępne wyniki", "wstępnych wyników")}.`
      : "Wyszukiwanie zakończone.";
    return `${found} AI wybiera najlepiej pasujące, to potrwa kilka sekund.`;
  }
  if (phase !== "done") return null;
  if (!n) return "Gotowe. W Bibliotece ROPS nie ma innowacji, która pasuje do opisu.";
  return data.picked_by === "ai"
    ? `Gotowe. Znaleźliśmy ${n} ${plural(n, "propozycję", "propozycje", "propozycji")} AI.`
    : `Gotowe. Znaleźliśmy ${n} ${plural(n, "innowację", "innowacje", "innowacji")}.`;
}
