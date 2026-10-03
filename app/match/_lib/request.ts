// Client-side logic of the /match page: request building and the two-phase fetch.
// Phase 1 asks for the ranking only (ai: false, well under a second); phase 2 asks again with AI
// for the picks and reasons (8–25 s on the free LLM tier, instant when cached).
import { MatchResponse, type MatchRequest, type MatchRole } from "@/lib/contracts/match";

export const ROLE_OPTIONS: { value: MatchRole; label: string }[] = [
  { value: "mieszkaniec", label: "Mieszkaniec" },
  { value: "jst", label: "Gmina lub ośrodek pomocy" },
  { value: "ngo", label: "Organizacja pozarządowa" },
];

export const EXAMPLES = [
  "Samotni seniorzy na wsi z objawami depresji",
  "Bezdomni nie mają gdzie się umyć zimą",
  "Niewidomi petenci gubią się w urzędzie",
];

export const MIN_LENGTH = 10;
export const MAX_LENGTH = 2000;

export type FormValues = { description: string; role: MatchRole; municipality: string };

export function buildRequest(values: FormValues, ai: boolean): MatchRequest {
  const municipality = values.municipality.trim();
  return {
    description: values.description.trim(),
    role: values.role,
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
        error: body?.error ?? "Nie udało się dopasować. Spróbuj ponownie za chwilę.",
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
