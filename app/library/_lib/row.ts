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

// Rows → contract, skipping a row that does not fit it (logged): one broken card must not take
// the whole Library down
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function innovationsFromRows(rows: any[]): Innovation[] {
  return rows.flatMap((row) => {
    try {
      return [innovationFromRow(row)];
    } catch (e) {
      console.error(`Zasobnik: pomijam kartę ${row?.id}, niezgodna z kontraktem`, e);
      return [];
    }
  });
}
