import type { Notification } from "@/lib/contracts/notifications";

// State of the header bell, kept pure so it can be unit-tested without a browser.
export type BellState = {
  unread: number;
  items: Notification[] | null; // null until the list is loaded (first open)
  announcement: string; // text for the global live region (announce())
  // Bumped with every announcement, so the same text ("Nowe powiadomienie: …") is read again
  announcementId: number;
};

export type BellAction =
  | { type: "loaded"; items: Notification[]; unread: number }
  | { type: "received"; item: Notification }
  | { type: "updated"; item: Notification }
  | { type: "read"; ids?: string[] }
  // Fallback when Realtime is unavailable (blocked WebSocket): the list fetched again in the background
  | { type: "polled"; items: Notification[]; unread: number };

const MAX_ITEMS = 50;

export function bellReducer(state: BellState, action: BellAction): BellState {
  switch (action.type) {
    case "loaded":
      return { ...state, items: action.items, unread: action.unread };
    case "received": {
      if (state.items?.some((n) => n.id === action.item.id)) return state;
      return {
        unread: state.unread + (action.item.przeczytane ? 0 : 1),
        items: state.items ? [action.item, ...state.items].slice(0, MAX_ITEMS) : null,
        announcement: `Nowe powiadomienie: ${action.item.tytul}`,
        announcementId: state.announcementId + 1,
      };
    }
    case "updated": {
      const before = state.items?.find((n) => n.id === action.item.id);
      // Without the list we only know a row became read; the count cannot go below zero.
      const delta = before ? Number(!before.przeczytane) - Number(!action.item.przeczytane) : 0;
      return {
        ...state,
        unread: Math.max(0, state.unread - delta),
        items: state.items?.map((n) => (n.id === action.item.id ? action.item : n)) ?? null,
      };
    }
    case "polled": {
      // A new unread notification is one we have not seen; without a list, a higher count says so
      const known = state.items ? new Set(state.items.map((n) => n.id)) : null;
      const fresh = action.items.find(
        (n) => !n.przeczytane && (known ? !known.has(n.id) : action.unread > state.unread),
      );
      return {
        items: action.items,
        unread: action.unread,
        announcement: fresh ? `Nowe powiadomienie: ${fresh.tytul}` : state.announcement,
        announcementId: fresh ? state.announcementId + 1 : state.announcementId,
      };
    }
    case "read": {
      const ids = action.ids;
      const items =
        state.items?.map((n) => (!ids || ids.includes(n.id) ? { ...n, przeczytane: true } : n)) ??
        null;
      const unread = !ids
        ? 0
        : Math.max(
            0,
            state.unread -
              (state.items?.filter((n) => ids.includes(n.id) && !n.przeczytane).length ?? 0),
          );
      return { ...state, items, unread };
    }
  }
}

const TIME = new Intl.DateTimeFormat("pl-PL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Warsaw",
});

const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" });
const DATE = new Intl.DateTimeFormat("pl-PL", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Warsaw",
});

// Older notifications get their day too: "14:00" alone does not say whether it was today.
export function shortTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const minutes = Math.round((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return "przed chwilą";
  if (minutes < 60) return `${minutes} min temu`;
  if (DAY.format(date) === DAY.format(now)) return `dziś, ${TIME.format(date)}`;
  if (DAY.format(date) === DAY.format(new Date(now.getTime() - 86400000)))
    return `wczoraj, ${TIME.format(date)}`;
  return `${DATE.format(date)}, ${TIME.format(date)}`;
}

function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const tens = n % 100;
  const units = n % 10;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}

/** Read out when the opened list has loaded ("Wczytujemy…" itself is not announced). */
export function loadedSummary(items: number, unread: number): string {
  if (items === 0) return "Nie masz jeszcze powiadomień.";
  const list = `${items} ${plural(items, "powiadomienie", "powiadomienia", "powiadomień")}`;
  return unread > 0
    ? `${list}, w tym ${unread} ${plural(unread, "nowe", "nowe", "nowych")}.`
    : `${list}, wszystkie przeczytane.`;
}
