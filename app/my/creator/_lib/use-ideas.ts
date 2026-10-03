"use client";

import { useSyncExternalStore } from "react";
import type { IdeaWithCanvas } from "@/lib/contracts/idea-creator";
import { createIdeaStore, type IdeaStore, type StorageLike } from "./store";

let store: IdeaStore | null = null;

// One store per browser tab; falls back to memory when localStorage is blocked (private mode)
export function ideaStore(): IdeaStore {
  store ??= createIdeaStore(browserStorage());
  return store;
}

function browserStorage(): StorageLike {
  try {
    const probe = "hubmi-probe";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    const memory = new Map<string, string>();
    return { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => void memory.set(k, v) };
  }
}

function subscribe(onChange: () => void) {
  const unsubscribe = ideaStore().subscribe(onChange);
  window.addEventListener("storage", onChange); // changes from another tab
  return () => {
    unsubscribe();
    window.removeEventListener("storage", onChange);
  };
}

// null while rendering on the server: drafts exist only in the browser
export function useIdeas(): IdeaWithCanvas[] | null {
  return useSyncExternalStore(
    subscribe,
    () => ideaStore().list(),
    () => null,
  );
}

// undefined = not found, null = still loading
export function useIdea(id: string): IdeaWithCanvas | undefined | null {
  const ideas = useIdeas();
  return ideas === null ? null : ideas.find((idea) => idea.id === id);
}
