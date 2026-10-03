import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

const { generateJson, createLlmClient, idFrom, LlmError } = await import("./llm");
const { memoryCache } = await import("./cache");
type ChatMessage = import("./llm").ChatMessage;

const Pick = z.object({ id: z.string(), reason: z.string() });

// A fake model that returns the given answers in order and records what it was sent.
function fakeClient(...answers: string[]) {
  const calls: ChatMessage[][] = [];
  return {
    calls,
    client: {
      model: "test-model",
      async complete(messages: ChatMessage[]) {
        calls.push(messages);
        if (!answers.length) throw new Error("no more answers");
        return answers.shift()!;
      },
    },
  };
}

const ask: ChatMessage[] = [
  { role: "system", content: "Pick one innovation. Answer in JSON." },
  { role: "user", content: "Samotni seniorzy" },
];

describe("generateJson", () => {
  it("returns the validated answer", async () => {
    const { client } = fakeClient('{"id": "senior-cuder", "reason": "Pasuje."}');
    await expect(generateJson(Pick, ask, { client })).resolves.toEqual({
      id: "senior-cuder",
      reason: "Pasuje.",
    });
  });

  it("accepts JSON wrapped in a code fence", async () => {
    const { client } = fakeClient('```json\n{"id": "a", "reason": "b"}\n```');
    await expect(generateJson(Pick, ask, { client })).resolves.toEqual({ id: "a", reason: "b" });
  });

  it("retries once when the answer is not JSON, telling the model why", async () => {
    const { client, calls } = fakeClient(
      "Oto odpowiedź: senior-cuder",
      '{"id": "a", "reason": "b"}',
    );
    await expect(generateJson(Pick, ask, { client })).resolves.toEqual({ id: "a", reason: "b" });
    expect(calls).toHaveLength(2);
    expect(calls[1].at(-1)?.content).toContain("not valid JSON");
    expect(calls[1].at(-2)).toEqual({ role: "assistant", content: "Oto odpowiedź: senior-cuder" });
  });

  it("retries once when the answer does not match the schema, naming the bad field", async () => {
    const { client, calls } = fakeClient('{"id": "a"}', '{"id": "a", "reason": "b"}');
    await generateJson(Pick, ask, { client });
    expect(calls[1].at(-1)?.content).toContain("reason");
  });

  it("gives up after one retry", async () => {
    const { client, calls } = fakeClient('{"id": 1}', '{"id": 2}', '{"id": "a", "reason": "b"}');
    await expect(generateJson(Pick, ask, { client })).rejects.toMatchObject({
      kind: "invalid_response",
    });
    expect(calls).toHaveLength(2);
  });

  it("never sends personal data to the model", async () => {
    const { client, calls } = fakeClient('{"id": "a", "reason": "b"}');
    const messages: ChatMessage[] = [
      { role: "system", content: "Answer in JSON." },
      {
        role: "user",
        content: "Mama (tel. 600 123 456, jan.kowalski@wp.pl, PESEL 85010112345) gubi się.",
      },
    ];
    await generateJson(Pick, messages, { client });
    const sent = JSON.stringify(calls[0]);
    expect(sent).not.toMatch(/600|123 456|jan\.kowalski|85010112345/);
    expect(sent).toContain("gubi się");
  });

  it("adds a JSON instruction when the prompt does not mention JSON (required by JSON mode)", async () => {
    const { client, calls } = fakeClient('{"id": "a", "reason": "b"}');
    await generateJson(Pick, [{ role: "user", content: "Samotni seniorzy" }], { client });
    expect(calls[0][0]).toEqual({ role: "system", content: "Respond with a single JSON object." });
  });

  describe("cache", () => {
    it("answers a repeated request from the cache", async () => {
      const cache = memoryCache();
      const { client, calls } = fakeClient('{"id": "a", "reason": "b"}');
      await generateJson(Pick, ask, { client, cache, cacheSecret: "s" });
      await expect(generateJson(Pick, ask, { client, cache, cacheSecret: "s" })).resolves.toEqual({
        id: "a",
        reason: "b",
      });
      expect(calls).toHaveLength(1);
    });

    it("ignores a cached value that no longer matches the schema", async () => {
      const cache = memoryCache();
      const { client: first } = fakeClient('{"id": "a", "reason": "b"}');
      await generateJson(Pick, ask, { client: first, cache, cacheSecret: "s" });
      const Stricter = Pick.extend({ quote: z.string() });
      const { client, calls } = fakeClient('{"id": "a", "reason": "b", "quote": "c"}');
      await generateJson(Stricter, ask, { client, cache, cacheSecret: "s" });
      expect(calls).toHaveLength(1);
    });

    it("keeps working when the cache fails", async () => {
      const broken = {
        get: () => Promise.reject(new Error("db down")),
        set: () => Promise.reject(new Error("db down")),
      };
      const { client } = fakeClient('{"id": "a", "reason": "b"}');
      await expect(
        generateJson(Pick, ask, { client, cache: broken, cacheSecret: "s" }),
      ).resolves.toEqual({
        id: "a",
        reason: "b",
      });
    });

    it("does not cache invalid answers", async () => {
      const cache = memoryCache();
      const { client } = fakeClient('{"id": 1}', '{"id": 2}');
      await expect(
        generateJson(Pick, ask, { client, cache, cacheSecret: "s" }),
      ).rejects.toBeInstanceOf(LlmError);
      const { client: next, calls } = fakeClient('{"id": "a", "reason": "b"}');
      await generateJson(Pick, ask, { client: next, cache, cacheSecret: "s" });
      expect(calls).toHaveLength(1);
    });
  });
});

describe("idFrom", () => {
  it("accepts only the given ids or none", () => {
    const Id = idFrom(["bawita", "merkury"]);
    expect(Id.safeParse("bawita").success).toBe(true);
    expect(Id.safeParse("none").success).toBe(true);
    expect(Id.safeParse("wymyslona-innowacja").success).toBe(false);
  });
});

describe("createLlmClient", () => {
  it("fails clearly when the configuration is missing", () => {
    const env = { LLM_BASE_URL: "https://x" } as unknown as NodeJS.ProcessEnv;
    expect(() => createLlmClient(env)).toThrow(/LLM_MODEL/);
  });
});

describe("createLlmClient timeout", () => {
  it("accepts a longer per-request timeout for long answers", () => {
    const env = {
      LLM_BASE_URL: "https://x",
      LLM_MODEL: "m",
      LLM_API_KEY: "k",
    } as unknown as NodeJS.ProcessEnv;
    expect(createLlmClient(env, 90_000).model).toBe("m");
  });
});

describe("generateJson with AI_REPLAY (stage demo)", () => {
  it("records a valid answer, then replays it without calling the model", async () => {
    const { memoryReplay } = await import("./replay");
    const file = { entries: {} as Record<string, { note: string; value: unknown }> };
    const { client } = fakeClient('{"id": "senior-cuder", "reason": "Pasuje."}');
    await generateJson(Pick, ask, { client, replay: memoryReplay("record", file) });
    const [entry] = Object.values(file.entries);
    expect(entry).toEqual({
      note: "Samotni seniorzy",
      value: { id: "senior-cuder", reason: "Pasuje." },
    });

    const silent = fakeClient();
    await expect(
      generateJson(Pick, ask, { client: silent.client, replay: memoryReplay("replay", file) }),
    ).resolves.toEqual({ id: "senior-cuder", reason: "Pasuje." });
    expect(silent.calls).toHaveLength(0);
  });

  it("asks the model when nothing is recorded or the recording no longer fits the schema", async () => {
    const { memoryReplay, replayKey } = await import("./replay");
    const live = fakeClient('{"id": "a", "reason": "b"}', '{"id": "c", "reason": "d"}');
    const empty = memoryReplay("replay");
    await expect(generateJson(Pick, ask, { client: live.client, replay: empty })).resolves.toEqual({
      id: "a",
      reason: "b",
    });
    expect(empty.get(replayKey(ask))).toBeNull(); // replay mode never writes

    const stale = memoryReplay("replay");
    await stale.record(replayKey(ask), { id: 1 }, "");
    await expect(generateJson(Pick, ask, { client: live.client, replay: stale })).resolves.toEqual({
      id: "c",
      reason: "d",
    });
  });

  it("records even when the answer is already in the AI cache", async () => {
    const { memoryReplay } = await import("./replay");
    const cache = memoryCache();
    await generateJson(Pick, ask, {
      client: fakeClient('{"id": "a", "reason": "b"}').client,
      cache,
      cacheSecret: "s",
    });
    const file = { entries: {} as Record<string, { note: string; value: unknown }> };
    const live = fakeClient('{"id": "c", "reason": "d"}');
    await generateJson(Pick, ask, {
      client: live.client,
      cache,
      cacheSecret: "s",
      replay: memoryReplay("record", file),
    });
    expect(live.calls).toHaveLength(1);
    expect(Object.values(file.entries)[0].value).toEqual({ id: "c", reason: "d" });
  });

  it("keys recordings on redacted text, so a phone number never reaches the file", async () => {
    const { memoryReplay } = await import("./replay");
    const file = { entries: {} as Record<string, { note: string; value: unknown }> };
    const { client } = fakeClient('{"id": "x", "reason": "y"}');
    await generateJson(
      Pick,
      [ask[0], { role: "user", content: "Mama sama w domu, tel. 601 234 567" }],
      { client, replay: memoryReplay("record", file) },
    );
    expect(JSON.stringify(file)).not.toContain("601");
  });
});
