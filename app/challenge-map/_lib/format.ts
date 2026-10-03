// Polish plural forms: 1 wyzwanie, 2–4 wyzwania, 5+ wyzwań
export function formatChallengeCount(n: number): string {
  if (n === 1) return "1 wyzwanie";
  const mod10 = n % 10;
  const mod100 = n % 100;
  return mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? `${n} wyzwania` : `${n} wyzwań`;
}

// The title names the area the visitor picked (WCAG 2.4.2)
export function challengeMapTitle(areaName: string | null): string {
  return areaName
    ? `${areaName} – Mapa wyzwań społecznych – HubMI.pl`
    : "Mapa wyzwań społecznych – HubMI.pl";
}
