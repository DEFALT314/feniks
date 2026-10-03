import type { z } from "zod";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

const OFFLINE = "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.";
const UNEXPECTED = "Coś poszło nie tak. Spróbuj ponownie za chwilę.";

/**
 * POST to one of our JSON endpoints (P3's /api/ai/* and /api/match). Errors come back as
 * { error: "plain Polish message" }; a response that doesn't match the contract counts as an error.
 */
export async function postJson<T>(
  url: string,
  body: unknown,
  schema: z.ZodType<T>,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: OFFLINE };
  }
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      json && typeof json === "object" && "error" in json && typeof json.error === "string"
        ? json.error
        : UNEXPECTED;
    return { ok: false, error: message };
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: UNEXPECTED };
}
