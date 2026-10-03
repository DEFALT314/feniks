// The only way to call the language model (CLAUDE.md, rule 5).
// OpenAI-compatible API: DeepSeek directly or through the Hugging Face router, set by
// LLM_BASE_URL, LLM_MODEL, LLM_API_KEY (server-side only).
//
// generateJson():
// - removes personal data from every message before sending it,
// - asks for JSON (JSON mode) and validates the answer with a zod schema,
// - on an invalid answer retries once, telling the model what was wrong,
// - optionally caches valid answers (lib/ai/cache.ts).
import "server-only";
import OpenAI from "openai";
import { z } from "zod";
import { cacheKey, type AiCache } from "./cache";
import { redactPersonalData } from "./privacy";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export interface LlmClient {
  model: string;
  complete(
    messages: ChatMessage[],
    options: { temperature: number; maxTokens: number },
  ): Promise<string>;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly kind: "config" | "request" | "invalid_response",
  ) {
    super(message);
    this.name = "LlmError";
  }
}

export function createLlmClient(
  env: NodeJS.ProcessEnv = process.env,
  timeoutMs = 30_000,
): LlmClient {
  const { LLM_BASE_URL, LLM_MODEL, LLM_API_KEY } = env;
  if (!LLM_BASE_URL || !LLM_MODEL || !LLM_API_KEY) {
    throw new LlmError("LLM_BASE_URL, LLM_MODEL and LLM_API_KEY must be set", "config");
  }
  const client = new OpenAI({
    baseURL: LLM_BASE_URL,
    apiKey: LLM_API_KEY,
    timeout: timeoutMs,
    maxRetries: 1,
  });
  return {
    model: LLM_MODEL,
    async complete(messages, { temperature, maxTokens }) {
      try {
        const response = await client.chat.completions.create({
          model: LLM_MODEL,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: "json_object" },
        });
        return response.choices[0]?.message?.content ?? "";
      } catch (e) {
        throw new LlmError(`LLM request failed: ${(e as Error).message}`, "request");
      }
    },
  };
}

// An id the model may choose: only from the given list, or "none" (CLAUDE.md, rule 5).
export function idFrom(ids: readonly string[]) {
  return z.enum([...new Set([...ids, "none"])] as [string, ...string[]]);
}

// Models sometimes wrap JSON in a ```json fence despite JSON mode.
function parseJson(text: string): unknown {
  const unfenced = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(unfenced);
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

export type GenerateJsonOptions = {
  client?: LlmClient;
  cache?: AiCache;
  cacheSecret?: string; // defaults to LLM_API_KEY, which only the server knows
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number; // per request; long answers (an SVG drawing) need more than the default 30 s
};

export async function generateJson<T>(
  schema: z.ZodType<T>,
  messages: ChatMessage[],
  options: GenerateJsonOptions = {},
): Promise<T> {
  const client = options.client ?? createLlmClient(process.env, options.timeoutMs);
  const settings = {
    temperature: options.temperature ?? 0.2,
    maxTokens: options.maxTokens ?? 2000,
  };

  let safe = messages.map((m) => ({ ...m, content: redactPersonalData(m.content) }));
  if (!safe.some((m) => /json/i.test(m.content))) {
    // JSON mode requires the word "json" in the prompt.
    safe = [{ role: "system", content: "Respond with a single JSON object." }, ...safe];
  }

  const secret = options.cacheSecret ?? process.env.LLM_API_KEY;
  const key =
    options.cache && secret
      ? cacheKey(secret, { model: client.model, settings, messages: safe })
      : null;
  if (key && options.cache) {
    const cached = schema.safeParse(await options.cache.get(key).catch(() => null));
    if (cached.success) return cached.data;
  }

  let conversation = safe;
  let problem = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await client.complete(conversation, settings);
    let parsed: unknown;
    try {
      parsed = parseJson(raw);
    } catch {
      problem = "the answer was not valid JSON";
      conversation = [...conversation, { role: "assistant", content: raw }, retryMessage(problem)];
      continue;
    }
    const result = schema.safeParse(parsed);
    if (result.success) {
      if (key && options.cache) await options.cache.set(key, result.data).catch(() => undefined);
      return result.data;
    }
    problem = describeIssues(result.error);
    conversation = [...conversation, { role: "assistant", content: raw }, retryMessage(problem)];
  }
  throw new LlmError(`invalid response after retry: ${problem}`, "invalid_response");
}

function retryMessage(problem: string): ChatMessage {
  return {
    role: "user",
    content: `Your previous answer did not match the required format (${problem}). Reply again with only the corrected JSON object.`,
  };
}
