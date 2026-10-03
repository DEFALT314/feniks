import { describe, expect, it } from "vitest";
import { FiltryBiblioteki } from "@/lib/contracts/zasobnik";
import { innowacjeZPlikow, kategorieZPlikow } from "./z-plikow";
import { normalizuj, rdzen, rdzenieZapytania, szukaj } from "./szukaj";
import { adresBiblioteki } from "./adres";

const katalog = innowacjeZPlikow();
const dostepne = { kategorie: kategorieZPlikow(), grupy: [], etykiety: [] };
const filtry = (p: Record<string, unknown> = {}) => FiltryBiblioteki.parse(p);

describe("normalizacja zapytania", () => {
  it("usuwa polskie znaki i wielkie litery", () => {
    expect(normalizuj("Samotność Seniorów, Łódź!")).toBe("samotnosc seniorow lodz");
  });

  it("łączy odmiany przez wspólny rdzeń", () => {
    expect(rdzen("seniorow")).toBe(rdzen("seniorzy").slice(0, 5));
    expect("seniorzy".startsWith(rdzen("seniorow"))).toBe(true);
  });

  it("pomija krótkie i nieznaczące słowa", () => {
    expect(rdzenieZapytania("pomoc dla seniorów w domu")).toEqual(
      rdzenieZapytania("pomoc seniorów domu"),
    );
    expect(rdzenieZapytania("pomoc dla seniorów w domu")).toHaveLength(3);
  });
});

describe("szukaj", () => {
  it("bez filtrów zwraca cały opublikowany katalog, najpierw sprawdzone przez ROPS", () => {
    const wynik = szukaj(katalog, filtry(), dostepne);
    expect(wynik.liczba).toBe(158);
    expect(wynik.wyniki).toHaveLength(20);
    expect(wynik.wyniki[0].sprawdzona_przez_rops).toBe(true);
    expect(wynik.liczba_stron).toBe(8);
  });

  it("rekordy z niepełnym opisem są na końcu listy", () => {
    const wynik = szukaj(katalog, filtry(), dostepne, 1000);
    const ostatni = wynik.wyniki[wynik.wyniki.length - 1];
    expect(ostatni.opis_niepelny).toBe(true);
  });

  it("wyszukiwanie znajduje BaWita po słowie kluczowym w innej odmianie", () => {
    const wynik = szukaj(katalog, filtry({ q: "tablica manipulacyjna" }), dostepne);
    expect(wynik.wyniki[0].id).toBe("bawita");
  });

  it("nazwa waży więcej niż opis", () => {
    const wynik = szukaj(katalog, filtry({ q: "Merkury" }), dostepne);
    expect(wynik.wyniki[0].nazwa).toContain("Merkury");
  });

  it("filtruje po kilku kategoriach naraz", () => {
    const wynik = szukaj(
      katalog,
      filtry({ kategoria: ["dla-seniorow", "dla-rynku-pracy"] }),
      dostepne,
      1000,
    );
    expect(new Set(wynik.wyniki.map((i) => i.kategoria_id))).toEqual(
      new Set(["dla-seniorow", "dla-rynku-pracy"]),
    );
  });

  it("sprawdzona=1 zostawia 27 wybranych do upowszechniania", () => {
    expect(szukaj(katalog, filtry({ sprawdzona: "1" }), dostepne).liczba).toBe(27);
  });

  it("licznik kategorii nie zależy od zaznaczonej kategorii, ale zależy od pozostałych filtrów", () => {
    const wynik = szukaj(katalog, filtry({ kategoria: "dla-seniorow", film: "1" }), dostepne);
    const zFilmem = katalog.filter((i) => i.ma_film);
    expect(wynik.liczniki.kategorie["dla-rynku-pracy"] ?? 0).toBe(
      zFilmem.filter((i) => i.kategoria_id === "dla-rynku-pracy").length,
    );
    expect(wynik.liczba).toBe(zFilmem.filter((i) => i.kategoria_id === "dla-seniorow").length);
  });

  it("strona spoza zakresu daje ostatnią stronę", () => {
    const wynik = szukaj(katalog, filtry({ strona: "99" }), dostepne);
    expect(wynik.strona).toBe(wynik.liczba_stron);
  });

  it("brak dopasowania daje pustą listę", () => {
    expect(szukaj(katalog, filtry({ q: "qqqzzzxxx" }), dostepne).liczba).toBe(0);
  });
});

describe("filtry z adresu strony", () => {
  it("sprawdzona=false nie włącza filtra", () => {
    expect(filtry({ sprawdzona: "false" }).sprawdzona).toBe(false);
  });

  it("zła strona wraca do 1", () => {
    expect(filtry({ strona: "abc" }).strona).toBe(1);
  });

  it("adres zachowuje filtry i zmienia stronę", () => {
    const f = filtry({ q: "seniorzy", kategoria: ["a", "b"], film: "1" });
    expect(adresBiblioteki(f, { strona: 2 })).toBe(
      "/biblioteka?q=seniorzy&kategoria=a&kategoria=b&film=1&strona=2",
    );
    expect(adresBiblioteki(filtry())).toBe("/biblioteka");
  });
});
