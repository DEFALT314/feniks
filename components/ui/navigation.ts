// Roles as stored in the database (SQL function public.moja_rola())
export type Role = "mieszkaniec" | "ngo" | "jst" | "ekspert" | "rops_redaktor" | "rops_admin";

export type CurrentUser = { name: string; role: Role };

export type NavItem = { label: string; href: string };

const PUBLIC_ITEMS: NavItem[] = [
  { label: "Dopasuj rozwiązanie", href: "/match" },
  { label: "Biblioteka", href: "/library" },
  { label: "Mapa wyzwań", href: "/challenge-map" },
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

// Main menu per design/makiety/Naglowek.dc.html: public pages for everyone, "Panel ROPS" for ROPS
// staff. Short enough to stay in one row from 1024 px up, for every role (#75).
export function navItemsFor(role: Role | null): NavItem[] {
  const items = [...PUBLIC_ITEMS];
  if (role === "rops_redaktor" || role === "rops_admin") {
    items.push({ label: "Panel ROPS", href: "/admin" });
  }
  return items;
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
