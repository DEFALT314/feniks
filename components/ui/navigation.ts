// Roles as stored in the database (SQL function public.moja_rola())
export type Role = "mieszkaniec" | "ngo" | "jst" | "ekspert" | "rops_redaktor" | "rops_admin";

export type CurrentUser = { name: string; role: Role };

export type NavItem = { label: string; href: string };

const PUBLIC_ITEMS: NavItem[] = [
  { label: "Dopasuj rozwiązanie", href: "/dopasuj" },
  { label: "Biblioteka", href: "/biblioteka" },
  { label: "Mapa wyzwań", href: "/mapa-wyzwan" },
];

const SIGNED_IN_ITEMS: NavItem[] = [
  { label: "Moje pomysły", href: "/moje/kreator" },
  { label: "Testy", href: "/moje/tester" },
  { label: "Wiadomości", href: "/moje/wiadomosci" },
];

const ROLE_LABELS: Record<Role, string> = {
  mieszkaniec: "mieszkaniec",
  ngo: "organizacja",
  jst: "gmina (JST)",
  ekspert: "ekspert",
  rops_redaktor: "redakcja ROPS",
  rops_admin: "administracja ROPS",
};

// Main menu per design/makiety/Naglowek.dc.html: personal pages only when signed in,
// "Karta usługi" for municipalities and NGOs, "Panel ROPS" for ROPS staff.
export function navItemsFor(role: Role | null): NavItem[] {
  if (!role) return PUBLIC_ITEMS;
  const items = [...PUBLIC_ITEMS, ...SIGNED_IN_ITEMS];
  if (role === "jst" || role === "ngo")
    items.push({ label: "Karta usługi", href: "/moje/middleman" });
  if (role === "rops_redaktor" || role === "rops_admin") {
    items.push({ label: "Panel ROPS", href: "/admin" });
  }
  return items;
}

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

// A menu item is active on its own page and on every page below it (/biblioteka/abc → Biblioteka)
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function notificationsLabel(unread: number): string {
  return unread > 0 ? `Powiadomienia: ${unread} nowe` : "Powiadomienia: brak nowych";
}
