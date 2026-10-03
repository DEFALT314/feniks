import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { embedQuery, embedUrl } = await import("./embed");
const env = (e: Record<string, string>) => e as unknown as NodeJS.ProcessEnv;

describe("embedUrl", () => {
  it("prefers EMBED_URL, else the same deployment", () => {
    expect(embedUrl(env({ EMBED_URL: "http://localhost:7860/api/embed" }))).toBe(
      "http://localhost:7860/api/embed",
    );
    expect(embedUrl(env({ VERCEL_URL: "hubmi-abc.vercel.app" }))).toBe(
      "https://hubmi-abc.vercel.app/api/embed",
    );
    expect(embedUrl(env({}))).toBeNull();
  });
});

describe("embedQuery", () => {
  const configured = env({ EMBED_URL: "http://e/api/embed", EMBED_TOKEN: "t" });

  it("sends the query with the token and returns the vector", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ vectors: [[0.1, 0.2]] })));
    expect(await embedQuery("samotni seniorzy", { env: configured, fetcher })).toEqual([0.1, 0.2]);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("http://e/api/embed");
    expect(init.headers["X-Embed-Token"]).toBe("t");
    expect(JSON.parse(init.body)).toEqual({ texts: ["samotni seniorzy"], kind: "query" });
  });

  it("passes Vercel's protection bypass on protected previews, and only when configured", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ vectors: [[1]] })));
    await embedQuery("x", { env: configured, fetcher });
    expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty("x-vercel-protection-bypass");
    await embedQuery("x", {
      env: env({ ...configured, VERCEL_AUTOMATION_BYPASS_SECRET: "b" }),
      fetcher,
    });
    expect(fetcher.mock.calls[1][1].headers["x-vercel-protection-bypass"]).toBe("b");
  });

  it("returns null instead of failing (keywords-only fallback)", async () => {
    const down = vi.fn().mockRejectedValue(new Error("timeout"));
    const error = vi.fn().mockResolvedValue(new Response("", { status: 500 }));
    expect(await embedQuery("x", { env: configured, fetcher: down })).toBeNull();
    expect(await embedQuery("x", { env: configured, fetcher: error })).toBeNull();
    expect(await embedQuery("x", { env: env({}), fetcher: down })).toBeNull();
    expect(down).toHaveBeenCalledTimes(1);
  });
});
