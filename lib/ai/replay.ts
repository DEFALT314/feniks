// Replay of recorded AI answers for the paths shown on stage (#20), so the demo does not depend
// on the network or on the model's mood.
//
//   AI_REPLAY=record  (locally, `pnpm dev`): every valid answer is saved to data/derived/ai-replay.json
//   AI_REPLAY=true    (preview/production for the show): a recorded answer is returned at once;
//                     anything not recorded goes to the model as usual.
//
// Not DEMO_MODE=replay: DEMO_MODE=true already switches on the demo accounts (lib/auth/demo-accounts.ts).
// The key is a SHA-256 of the redacted messages only (no model, no settings), so the recording
// survives a model change. Only fictional demo texts are recorded; the file is committed.
import "server-only";
import { createHash } from "node:crypto";
import recordings from "@/data/derived/ai-replay.json";

export type ReplayMode = "off" | "replay" | "record";

export interface ReplayStore {
  mode: ReplayMode;
  get(key: string): unknown | null;
  record(key: string, value: unknown, note: string): Promise<void>;
}

export const REPLAY_FILE = "data/derived/ai-replay.json";

export type ReplayFile = { entries: Record<string, { note: string; value: unknown }> };

export function replayMode(env: NodeJS.ProcessEnv = process.env): ReplayMode {
  if (env.AI_REPLAY === "true") return "replay";
  // Recording writes a file in the repository, so never on a deployment.
  if (env.AI_REPLAY === "record" && env.NODE_ENV !== "production") return "record";
  return "off";
}

export function replayKey(messages: { role: string; content: string }[]): string {
  return createHash("sha256")
    .update(JSON.stringify(messages.map((m) => [m.role, m.content])))
    .digest("hex");
}

// Short, readable label for a recording: the last user message, so a reviewer of the file sees
// which demo path it belongs to.
export function replayNote(messages: { role: string; content: string }[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  return last.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function memoryReplay(mode: ReplayMode, file: ReplayFile = { entries: {} }): ReplayStore {
  return {
    mode,
    get: (key) => file.entries[key]?.value ?? null,
    async record(key, value, note) {
      file.entries[key] = { note, value };
    },
  };
}

// The committed recordings; in record mode new answers are also written back to the file.
export function fileReplay(mode: ReplayMode): ReplayStore {
  const file = recordings as ReplayFile;
  const store = memoryReplay(mode, file);
  return {
    ...store,
    async record(key, value, note) {
      await store.record(key, value, note);
      const { readFile, writeFile } = await import("node:fs/promises");
      const path = `${process.cwd()}/${REPLAY_FILE}`;
      const onDisk = JSON.parse(await readFile(path, "utf8")) as ReplayFile;
      onDisk.entries[key] = { note, value };
      const sorted = Object.fromEntries(
        Object.entries(onDisk.entries).sort(([a], [b]) => a.localeCompare(b)),
      );
      await writeFile(path, `${JSON.stringify({ entries: sorted }, null, 2)}\n`);
    },
  };
}
