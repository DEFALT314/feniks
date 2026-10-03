import { z } from "zod";
import fixture from "./fixtures/_przyklad.json";

// Wzór kontraktu. Skopiuj do lib/contracts/<modul>.ts i zmień nazwy.
// Endpoint: POST /api/przyklad

export const PrzykladWejscie = z.object({
  opis: z.string().min(10).max(2000),
});
export type PrzykladWejscie = z.infer<typeof PrzykladWejscie>;

export const PrzykladWyjscie = z.object({
  id: z.string(),
  nazwa: z.string(),
  tagi: z.array(z.string()),
  utworzono: z.iso.datetime(),
});
export type PrzykladWyjscie = z.infer<typeof PrzykladWyjscie>;

// Przykładowe dane sprawdzone schematem: błąd w fixtures wychodzi od razu.
export const przykladFixture: PrzykladWyjscie = PrzykladWyjscie.parse(fixture);
