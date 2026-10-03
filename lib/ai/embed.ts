// Client of the embedding function (api/embed.py, embedding/README.md).
// EMBED_URL defaults to the same deployment; EMBED_TOKEN is sent as X-Embed-Token.
import "server-only";

// In production the app calls its public domain: Vercel protects the per-deployment address
// (VERCEL_URL) even for production deployments, so a call there gets the login page, not vectors.
export function embedUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.EMBED_URL) return env.EMBED_URL;
  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}/api/embed`;
  }
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}/api/embed`;
  return null;
}

// Query vector, or null when the service is not configured or fails: matching then uses keywords only.
export async function embedQuery(
  text: string,
  { env = process.env, fetcher = fetch, timeoutMs = 15_000 } = {},
): Promise<number[] | null> {
  const url = embedUrl(env);
  if (!url || !env.EMBED_TOKEN) return null;
  try {
    const response = await fetcher(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Embed-Token": env.EMBED_TOKEN,
        // Preview deployments sit behind Vercel Authentication, which also blocks calls from the
        // app to its own /api/embed; Vercel's bypass secret lets this server-to-server call through.
        ...(env.VERCEL_AUTOMATION_BYPASS_SECRET
          ? { "x-vercel-protection-bypass": env.VERCEL_AUTOMATION_BYPASS_SECRET }
          : {}),
      },
      body: JSON.stringify({ texts: [text], kind: "query" }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const vector = (await response.json()).vectors?.[0];
    return Array.isArray(vector) && vector.length ? vector : null;
  } catch (e) {
    console.error("embeddings unavailable, keywords only:", (e as Error).message);
    return null;
  }
}
