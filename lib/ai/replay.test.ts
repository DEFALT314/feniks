import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { replayKey, replayMode, replayNote } = await import("./replay");
const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

describe("AI replay", () => {
  it("is off unless AI_REPLAY says otherwise; recording never on a production build", () => {
    expect(replayMode(env({}))).toBe("off");
    expect(replayMode(env({ AI_REPLAY: "true" }))).toBe("replay");
    expect(replayMode(env({ AI_REPLAY: "record", NODE_ENV: "development" }))).toBe("record");
    expect(replayMode(env({ AI_REPLAY: "record", NODE_ENV: "production" }))).toBe("off");
    expect(replayMode(env({ AI_REPLAY: "1" }))).toBe("off");
  });

  it("keys depend on the messages only", () => {
    const a = [{ role: "user", content: "samotni seniorzy" }];
    expect(replayKey(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(replayKey(a)).toBe(replayKey([{ role: "user", content: "samotni seniorzy" }]));
    expect(replayKey(a)).not.toBe(replayKey([{ role: "system", content: "samotni seniorzy" }]));
  });

  it("labels a recording with the last user message, shortened", () => {
    const note = replayNote([
      { role: "system", content: "rules" },
      { role: "user", content: `Opis:\n  ${"a".repeat(200)}` },
    ]);
    expect(note.startsWith("Opis: a")).toBe(true);
    expect(note).toHaveLength(120);
  });

  it("the committed recordings file is valid", async () => {
    const file = (await import("@/data/derived/ai-replay.json")).default as {
      entries: Record<string, { note: string; value: unknown }>;
    };
    for (const [key, entry] of Object.entries(file.entries)) {
      expect(key).toMatch(/^[0-9a-f]{64}$/);
      expect(typeof entry.note).toBe("string");
      expect(entry.value).not.toBeNull();
    }
  });
});
