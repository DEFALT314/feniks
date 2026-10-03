import { Innowacja } from "@/lib/contracts/zasobnik";

// Wiersz tabeli innovations → kontrakt (pola pochodne liczymy tutaj)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function innowacjaZWiersza(w: any): Innowacja {
  return Innowacja.parse({
    ...w,
    opis_niepelny: Boolean(w.spoza_biblioteki && w.pewnosc !== "pewne"),
    ma_film: Boolean(w.materialy?.film),
    ma_pdf: Boolean(w.materialy?.opis_pdf),
  });
}
