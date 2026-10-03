// Roles as stored in the database (SQL function public.moja_rola())
export type Role = "mieszkaniec" | "ngo" | "jst" | "ekspert" | "rops_redaktor" | "rops_admin";

export type CurrentUser = { name: string; role: Role };

export type NavItem = { label: string; href: string };

const PUBLIC_ITEMS: NavItem[] = [
  { label: "Dopasuj rozwiązanie", href: "/match" },
  { label: "Biblioteka", href: "/library" },
  { label: "Mapa wyzwań", href: "/challenge-map" },
  { label: "Wiedza", href: "/resources" },
];

// Personal pages live in the account menu ("Imię ▾"), so the main menu fits in one row (#75)
const ACCOUNT_ITEMS: NavItem[] = [
  { label: "Moje pomysły", href: "/my/creator" },
  { label: "Testy", href: "/my/tester" },
  { label: "Wiadomości", href: "/my/messages" },
];

const ROLE_LABELS: Record<Role, string> = {
  mieszkaniec: "mieszkaniec",
  ngo: "organizacja",
  jst: "gmina (JST)",
  ekspert: "ekspert",
  rops_redaktor: "redakcja ROPS",
  rops_admin: "administracja ROPS",
};

// The one personal page each role came for, shown in the main menu so it is not hidden behind the
// account menu: residents and organisations submit ideas, municipalities adapt innovations into a
// service, experts test, ROPS staff work in the panel.
const MAIN_TASK: Record<Role, NavItem> = {
  mieszkaniec: { label: "Moje pomysły", href: "/my/creator" },
  ngo: { label: "Moje pomysły", href: "/my/creator" },
  jst: { label: "Karta usługi", href: "/my/middleman" },
  ekspert: { label: "Testy", href: "/my/tester" },
  rops_redaktor: { label: "Panel ROPS", href: "/admin" },
  rops_admin: { label: "Panel ROPS", href: "/admin" },
};

// Main menu per design/makiety/Naglowek.dc.html: public pages for everyone, plus the role's main
// task when signed in. Short enough to stay in one row from 1024 px up, for every role (#75).
export function navItemsFor(role: Role | null): NavItem[] {
  return role ? [...PUBLIC_ITEMS, MAIN_TASK[role]] : [...PUBLIC_ITEMS];
}

// Account menu of a signed-in user: personal pages, "Karta usługi" for municipalities and NGOs,
// then the profile. Empty for visitors.
export function accountItemsFor(role: Role | null): NavItem[] {
  if (!role) return [];
  const items = [...ACCOUNT_ITEMS];
  if (role === "jst" || role === "ngo")
    items.push({ label: "Karta usługi", href: "/my/middleman" });
  items.push({ label: "Twój profil", href: "/my/profile" });
  return items;
}

/** Account items that the main menu does not already show (the phone menu lists both). */
export function withoutDuplicates(accountItems: NavItem[], mainItems: NavItem[]): NavItem[] {
  const shown = new Set(mainItems.map((i) => i.href));
  return accountItems.filter((i) => !shown.has(i.href));
}

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

// A menu item is active on its own page and on every page below it (/library/abc → Biblioteka)
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Visible unread count on the header bell: capped so the badge stays two digits wide. */
export function notificationsBadge(unread: number): string {
  return unread > 99 ? "99+" : String(unread);
}

export function notificationsLabel(unread: number): string {
  if (unread <= 0) return "Powiadomienia: brak nowych";
  return `Powiadomienia: ${unread} ${polishPlural(unread, "nowe", "nowe", "nowych")}`;
}

/** Polish plural form: 1 nowe powiadomienie, 2–4 nowe, 5–21 nowych, 22–24 nowe… */
export function polishPlural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  const tens = n % 100;
  const units = n % 10;
  return units >= 2 && units <= 4 && (tens < 12 || tens > 14) ? few : many;
}
