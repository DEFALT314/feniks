import type { Notification } from "@/lib/contracts/notifications";

// State of the header bell, kept pure so it can be unit-tested without a browser.
export type BellState = {
  unread: number;
  items: Notification[] | null; // null until the list is loaded (first open)
  announcement: string; // text for the aria-live region
};

export type BellAction =
  | { type: "loaded"; items: Notification[]; unread: number }
  | { type: "received"; item: Notification }
  | { type: "updated"; item: Notification }
  | { type: "read"; ids?: string[] };

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

export function shortTime(iso: string, now = new Date()): string {
  const minutes = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "przed chwilą";
  if (minutes < 60) return `${minutes} min temu`;
  return TIME.format(new Date(iso));
}
