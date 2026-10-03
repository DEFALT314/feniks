import { beforeEach, describe, expect, it } from "vitest";
import { createIdeaStore, type StorageLike } from "./store";

function memoryStorage(initial?: string): StorageLike & { raw(): string | null } {
  let value: string | null = initial ?? null;
  return { getItem: () => value, setItem: (_, v) => void (value = v), raw: () => value };
}

let clock = 0;
const options = {
  now: () => new Date(Date.UTC(2026, 9, 3, 18, 0, clock++)).toISOString(),
  newId: () => `00000000-0000-4000-8000-${String(clock).padStart(12, "0")}`,
};

beforeEach(() => {
  clock = 0;
});

describe("idea store", () => {
  it("creates an empty draft and lists newest first", () => {
    const store = createIdeaStore(memoryStorage(), options);
    const first = store.create("  Sąsiedzki dyżur  ");
    const second = store.create("Świetlica");
    expect(first.tytul).toBe("Sąsiedzki dyżur");
    expect(first.answers).toEqual({});
    expect(store.list().map((i) => i.id)).toEqual([second.id, first.id]);
  });

  it("saves a valid answer after each step and moves the idea to the top", () => {
    const store = createIdeaStore(memoryStorage(), options);
    const idea = store.create("A");
    store.create("B");
    expect(store.saveAnswer(idea.id, "intensywnosc", { choice: "Mocno przeszkadza" })).toBe(true);
    expect(store.get(idea.id)?.answers.intensywnosc).toEqual({ choice: "Mocno przeszkadza" });
    expect(store.list()[0].id).toBe(idea.id);
  });

  it("rejects invalid answers and unknown fields or ideas", () => {
    const store = createIdeaStore(memoryStorage(), options);
    const idea = store.create("A");
    expect(store.saveAnswer(idea.id, "intensywnosc", { choice: "nie ma takiej" })).toBe(false);
    expect(store.saveAnswer(idea.id, "nie-ma-pola", { choice: "x" })).toBe(false);
    expect(store.saveAnswer("brak", "intensywnosc", { choice: "Mocno przeszkadza" })).toBe(false);
    expect(store.get(idea.id)?.answers).toEqual({});
  });

  it("clears an answer with null", () => {
    const store = createIdeaStore(memoryStorage(), options);
    const idea = store.create("A");
    store.saveAnswer(idea.id, "intensywnosc", { choice: "Mocno przeszkadza" });
    store.saveAnswer(idea.id, "intensywnosc", null);
    expect(store.get(idea.id)?.answers).toEqual({});
  });

  it("fills an empty stage from the readiness answer but keeps one the author chose", () => {
    const store = createIdeaStore(memoryStorage(), options);
    const idea = store.create("A");
    store.saveAnswer(idea.id, "gotowosc", { choice: "Prototyp" });
    expect(store.get(idea.id)?.etap).toBe("prototyp");
    store.saveCard(idea.id, { etap: "gotowe" });
    store.saveAnswer(idea.id, "gotowosc", { choice: "Pomysł" });
    expect(store.get(idea.id)?.etap).toBe("gotowe");
  });

  it("saves card fields and refuses an empty title", () => {
    const store = createIdeaStore(memoryStorage(), options);
    const idea = store.create("A");
    expect(store.saveCard(idea.id, { opis: "Opis", istota: "Sedno" })).toBe(true);
    expect(store.saveCard(idea.id, { tytul: "" })).toBe(false);
    expect(store.get(idea.id)).toMatchObject({ tytul: "A", opis: "Opis", istota: "Sedno" });
  });

  it("returns the same list until something changes (needed by useSyncExternalStore)", () => {
    const store = createIdeaStore(memoryStorage(), options);
    store.create("A");
    const list = store.list();
    expect(store.list()).toBe(list);
    store.create("B");
    expect(store.list()).not.toBe(list);
  });

  it("notifies subscribers on change", () => {
    const store = createIdeaStore(memoryStorage(), options);
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    store.create("A");
    unsubscribe();
    store.create("B");
    expect(calls).toBe(1);
  });

  it("starts empty when saved data is broken", () => {
    expect(createIdeaStore(memoryStorage("{not json"), options).list()).toEqual([]);
    expect(createIdeaStore(memoryStorage('[{"id":1}]'), options).list()).toEqual([]);
  });
});
