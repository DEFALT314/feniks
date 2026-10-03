import { describe, expect, it } from "vitest";
import type { Notification } from "@/lib/contracts/notifications";
import { bellReducer, shortTime, type BellState } from "./bell-state";

const n = (id: string, przeczytane = false): Notification => ({
  id,
  user_id: "u1",
  typ: "pomysl_oceniony",
  tytul: `Powiadomienie ${id}`,
  link: "/my/creator",
  przeczytane,
  created_at: "2026-10-03T18:00:00+02:00",
});

const empty: BellState = { unread: 2, items: null, announcement: "" };

describe("bellReducer", () => {
  it("counts and announces a live notification even before the list is loaded", () => {
    const s = bellReducer(empty, { type: "received", item: n("a") });
    expect(s.unread).toBe(3);
    expect(s.items).toBeNull();
    expect(s.announcement).toBe("Nowe powiadomienie: Powiadomienie a");
  });

  it("prepends new items to a loaded list and ignores duplicates", () => {
    const loaded = bellReducer(empty, { type: "loaded", items: [n("b")], unread: 1 });
    const s = bellReducer(loaded, { type: "received", item: n("a") });
    expect(s.items?.map((i) => i.id)).toEqual(["a", "b"]);
    expect(bellReducer(s, { type: "received", item: n("a") })).toBe(s);
  });

  it("marks one or all as read without going below zero", () => {
    const loaded = bellReducer(empty, {
      type: "loaded",
      items: [n("a"), n("b"), n("c", true)],
      unread: 2,
    });
    const one = bellReducer(loaded, { type: "read", ids: ["a", "c"] });
    expect(one.unread).toBe(1);
    expect(one.items?.find((i) => i.id === "a")?.przeczytane).toBe(true);
    const all = bellReducer(one, { type: "read" });
    expect(all.unread).toBe(0);
    expect(all.items?.every((i) => i.przeczytane)).toBe(true);
  });

  it("follows read changes made in another tab", () => {
    const loaded = bellReducer(empty, { type: "loaded", items: [n("a")], unread: 1 });
    const s = bellReducer(loaded, { type: "updated", item: n("a", true) });
    expect(s.unread).toBe(0);
  });
});

describe("shortTime", () => {
  const now = new Date("2026-10-03T16:30:00Z");
  it("uses relative time for recent notifications", () => {
    expect(shortTime("2026-10-03T16:29:40Z", now)).toBe("przed chwilą");
    expect(shortTime("2026-10-03T16:10:00Z", now)).toBe("20 min temu");
    expect(shortTime("2026-10-03T12:00:00Z", now)).toBe("14:00");
  });
});
