import { z } from "zod";
import {
  IdeaWithCanvas,
  type CanvasAnswer,
  type IdeaCardInput,
} from "@/lib/contracts/idea-creator";
import { answerSchema, fields, stageFromAnswers } from "./canvas";

// Drafts of ideas, saved after every step. Until sign-in exists (#2, P4) they live in the browser;
// then the same operations move to public.ideas and public.idea_canvas (same shapes, same contract).
export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type IdeaStore = {
  list(): IdeaWithCanvas[]; // newest first; same array until something changes
  get(id: string): IdeaWithCanvas | undefined;
  create(title: string): IdeaWithCanvas;
  saveAnswer(id: string, fieldId: string, answer: CanvasAnswer | null): boolean;
  saveCard(id: string, input: IdeaCardInput): boolean;
  subscribe(onChange: () => void): () => void;
};

const STORAGE_KEY = "hubmi-ideas-v1";
const StoredIdeas = z.array(IdeaWithCanvas);

export function createIdeaStore(
  storage: StorageLike,
  options: { now?: () => string; newId?: () => string } = {},
): IdeaStore {
  const now = options.now ?? (() => new Date().toISOString());
  const newId = options.newId ?? (() => crypto.randomUUID());
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cached: IdeaWithCanvas[] = [];

  function read(): IdeaWithCanvas[] {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      const parsed = raw ? StoredIdeas.safeParse(safeJson(raw)) : null;
      cached = [...(parsed?.success ? parsed.data : [])].sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at),
      );
    }
    return cached;
  }

  function update(id: string, change: (idea: IdeaWithCanvas) => IdeaWithCanvas): boolean {
    const ideas = read();
    const current = ideas.find((idea) => idea.id === id);
    if (!current) return false;
    const next = { ...change(current), updated_at: now() };
    write([next, ...ideas.filter((idea) => idea.id !== id)]);
    return true;
  }

  function write(ideas: IdeaWithCanvas[]) {
    storage.setItem(STORAGE_KEY, JSON.stringify(ideas));
    listeners.forEach((listener) => listener());
  }

  return {
    list: read,
    get: (id) => read().find((idea) => idea.id === id),

    create(title) {
      const timestamp = now();
      const idea: IdeaWithCanvas = {
        id: newId(),
        tytul: title.trim(),
        opis: null,
        istota: null,
        dla_kogo: null,
        etap: null,
        obszar_id: null,
        wyslany_at: null,
        created_at: timestamp,
        updated_at: timestamp,
        answers: {},
      };
      IdeaWithCanvas.parse(idea);
      write([idea, ...read()]);
      return idea;
    },

    // null clears the answer ("Pomiń pytanie" after answering). The readiness answer fills an empty stage.
    saveAnswer(id, fieldId, answer) {
      const field = fields.find((f) => f.id === fieldId);
      if (!field) return false;
      if (answer !== null && !answerSchema(field).safeParse(answer).success) return false;
      return update(id, (idea) => {
        const answers = { ...idea.answers };
        if (answer === null) delete answers[fieldId];
        else answers[fieldId] = answer;
        return { ...idea, answers, etap: idea.etap ?? stageFromAnswers(answers) };
      });
    },

    saveCard(id, input) {
      const current = read().find((idea) => idea.id === id);
      if (!current) return false;
      const next = IdeaWithCanvas.safeParse({ ...current, ...input });
      if (!next.success) return false;
      return update(id, () => next.data);
    },

    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
