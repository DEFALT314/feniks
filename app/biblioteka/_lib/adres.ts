import type { FiltryBiblioteki } from "@/lib/contracts/zasobnik";

// Adres /biblioteka z filtrami; `zmiany` nadpisują bieżące filtry (np. inna strona)
export function adresBiblioteki(
  filtry: FiltryBiblioteki,
  zmiany: Partial<FiltryBiblioteki> = {},
): string {
  const f = { ...filtry, ...zmiany };
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  for (const k of f.kategoria) p.append("kategoria", k);
  if (f.grupa) p.set("grupa", f.grupa);
  if (f.etykieta) p.set("etykieta", f.etykieta);
  if (f.sprawdzona) p.set("sprawdzona", "1");
  if (f.film) p.set("film", "1");
  if (f.pdf) p.set("pdf", "1");
  if (f.strona > 1) p.set("strona", String(f.strona));
  const zapytanie = p.toString();
  return zapytanie ? `/biblioteka?${zapytanie}` : "/biblioteka";
}
