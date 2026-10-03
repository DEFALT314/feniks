// Shared request handling for the AI endpoints in app/api/ai/ (idea creator, Middleman).
import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { LlmError } from "./llm";
import { clientIp, createRateLimiter } from "./rate-limit";
import { DAILY_LIMIT_MESSAGE, dailyQuotaForCurrentUser } from "./usage";

// One budget for all AI endpoints of the creator and Middleman: 30 requests per hour per IP, plus
// a daily limit per signed-in user (lib/ai/usage.ts). Matchmaking has its own limiter in app/api/match.
const limiter = createRateLimiter(30, 60 * 60 * 1000);

export const llmConfigured = () =>
  Boolean(process.env.LLM_BASE_URL && process.env.LLM_MODEL && process.env.LLM_API_KEY);

export function jsonError(message: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers });
}

// Parses the body with the schema and applies the rate limit; returns the data or an error response.
export async function readAiRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { response: NextResponse }> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return {
      response: jsonError("Uzupełnij tytuł i opis pomysłu, a potem spróbuj ponownie.", 400),
    };
  }
  if (!llmConfigured()) {
    return { response: jsonError("Asystent AI jest teraz niedostępny. Spróbuj później.", 503) };
  }
  const limit = limiter(clientIp(request.headers));
  if (!limit.ok) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return {
      response: jsonError(`Za dużo próśb do asystenta. Spróbuj ponownie za ${minutes} min.`, 429, {
        "Retry-After": String(limit.retryAfterSeconds),
      }),
    };
  }
  const daily = await dailyQuotaForCurrentUser();
  if (!daily.ok) return { response: jsonError(DAILY_LIMIT_MESSAGE, 429) };
  return { data: parsed.data };
}

// Maps failures of the model to a plain Polish message; never exposes internal details.
export function aiFailure(error: unknown) {
  console.error("AI request failed:", (error as Error).message);
  const busy = error instanceof LlmError && error.kind === "request";
  return jsonError(
    busy
      ? "Asystent AI nie odpowiada. Spróbuj ponownie za chwilę."
      : "Asystent AI nie przygotował poprawnej odpowiedzi. Spróbuj ponownie.",
    busy ? 503 : 502,
  );
}
