import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/zasobnik.json";
import * as K from "./zasobnik";

describe("kontrakt Zasobnika: fixtures przechodzą walidację", () => {
  it.each([
    ["kategorie", K.Kategoria.array(), fixtures.kategorie],
    ["lista_innowacji", K.ListaInnowacji, fixtures.lista_innowacji],
    ["innowacja", K.Innowacja, fixtures.innowacja],
    ["innowacje", K.Innowacja.array(), fixtures.innowacje],
    ["obszary", K.Obszar.array(), fixtures.obszary],
    ["obszar_szczegoly", K.ObszarSzczegoly, fixtures.obszar_szczegoly],
    ["zasoby", K.Zasob.array(), fixtures.zasoby],
    ["edycja_innowacji", K.EdycjaInnowacji, fixtures.edycja_innowacji],
  ] as const)("%s", (_, schemat, dane) => {
    expect(schemat.safeParse(dane).success).toBe(true);
  });

  it("edycja odrzuca nieznane pola (np. id)", () => {
    expect(K.EdycjaInnowacji.safeParse({ id: "inne-id" }).success).toBe(false);
  });
});
