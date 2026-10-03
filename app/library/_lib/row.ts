import { Innovation } from "@/lib/contracts/knowledge-base";

// A row of the innovations table → contract (derived fields are computed here)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function innovationFromRow(row: any): Innovation {
  return Innovation.parse({
    ...row,
    opis_niepelny: Boolean(row.spoza_biblioteki && row.pewnosc !== "pewne"),
    ma_film: Boolean(row.materialy?.film),
    ma_pdf: Boolean(row.materialy?.opis_pdf),
  });
}
