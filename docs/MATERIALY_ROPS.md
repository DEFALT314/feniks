# Materiały ROPS: kontekst dla Claude Code

Wklej ten plik do repo jako `docs/MATERIALY_ROPS.md` i dopisz w głównym `CLAUDE.md` linię:
`Dane i materiały ROPS: patrz docs/MATERIALY_ROPS.md, pliki w data/rops/.`
Stan: 3.10.2026, pobrane ze stron rops.krakow.pl.

## Pliki (wrzuć do `data/rops/`)

| Plik | Co zawiera | Moduł |
|---|---|---|
| `biblioteka.json` | 115 innowacji z Biblioteki ROPS w 9 kategoriach: opis, problem, dla kogo, kto może wdrożyć, czy działa, instytucja autora, linki (karta, PDF, film, ZIP, zasady wykorzystania), 8–12 słów kluczowych | I Matchmaking, II Zasobnik, VII Middleman |
| `gold_matchmaking.jsonl` | 230 przykładowych zapytań → oczekiwane `id` innowacji | test trafności dopasowania (I) |
| `mapa_wyzwan.json` | Mapa Wyzwań Społecznych: 8 obszarów, 48 kluczowych wyzwań, dane, słowa kluczowe, 9 fikcyjnych person, mapowanie obszar → kategorie Biblioteki | I (klasyfikacja problemu), II, VI (trendy) |
| `canvas_innowacji.json` | Social Innovation Canvas INNO AGH: 3 arkusze, 22 pola z typem (jeden wybór, wiele, skala, macierz) i opcjami | III Kreator pomysłów |
| `raporty_i_publikacje.json` | 51 raportów z badań ROPS (2010–2026) z tagami + 6 publikacji o innowacjach | II Zasobnik |
| `scripts/sync-biblioteka.mjs` | Skrypt do ponownego pobrania Biblioteki (pełne teksty sekcji) | II, szybka aktualizacja |

## Liczby, które warto znać

- Biblioteka: seniorzy 20, dzieci/młodzież/rodzina 21, ograniczona mobilność 18, niepełnosprawność sensoryczna 20, intelektualna 14, zdrowie 9, cudzoziemcy 6, rynek pracy 5, bezdomność 2.
- 27 innowacji ma etykietę „wybrana do upowszechniania” (IWS 9, Inkubator Dostępności 9, MIIS 8, MIWS 1). Te pokazujemy wyżej w wynikach jako sprawdzone.
- 26 innowacji ma film na YouTube, 27 ma folder PDF, każda ma pakiet ZIP z materiałami.
- Strona Biblioteki ma baner „w przebudowie” – nasz Zasobnik może być jej nową, dostępną wersją.

## Jak tego używać w aplikacji

1. **Matchmaking (I):** tekst użytkownika → (a) BM25 po `nazwa + opis_krotki + problem + dla_kogo + slowa_kluczowe`, (b) embeddingi tego samego pola, (c) klasyfikacja do obszaru i wyzwania z `mapa_wyzwan.json` po słowach kluczowych. Wynik: obszar i wyzwanie („Twój problem to: Seniorzy → samotność”), 3 innowacje z podświetlonymi słowami, które zadecydowały, oraz link do karty ROPS.
2. **Test trafności:** `gold_matchmaking.jsonl` → skrypt liczy trafienie w top-3. Cel: ≥ 80%. Wynik pokazujemy jury jako liczbę.
3. **Persony z Mapy Wyzwań** (Janina 73 l., Stanisław 56 l., Krystian 38 l., Swietłana 37 l., Tomek 60 l., Kuba 22 l., Mateusz 17 l., Karina 41 l., rodzeństwo Ania i Staś) są fikcyjne i pochodzą od ROPS. Używamy ich jako scenariuszy demo zamiast wymyślonych osób.
4. **Kreator (III):** każde pole kanwy to jeden krok z dużymi przyciskami wyboru (dobre dla WCAG i seniorów). AI tylko podpowiada opcje i pisze tekst fiszki z zaznaczonych pól; użytkownik zatwierdza. Pola `mapowanie_fiszki` wskazują, które kroki wypełniają fiszkę (opis, istota, dla kogo, etap).
5. **Trendy dla admina (VI):** licznik zgłoszeń po `obszar.id` i `wyzwanie.id` z Mapy Wyzwań – te same identyfikatory w całej aplikacji.
6. **Middleman (VII):** z karty innowacji bierzemy `kto_moze_wdrozyc`, `dla_kogo` i materiały, a AI dopasowuje je do instytucji, która pyta (np. GOPS w gminie wiejskiej).

## Zasady

- Opisy w `biblioteka.json` są streszczone naszymi słowami. Pełny tekst jest zawsze pod `url` (karta ROPS). W aplikacji pokazujemy streszczenie i link „Zobacz pełną kartę w ROPS”.
- Bez danych osobowych: autor jest podany tylko jako instytucja. Nazwisk z kart ROPS nie kopiujemy do seedów.
- Kanwa INNO AGH: licencja nieustalona – przed pokazaniem jej 1:1 zapytać mentora ROPS. Do tego czasu kreator używa naszych sformułowań pytań.
- Treści raportów nie są streszczone. W Zasobniku pokazujemy tytuł, rok, tagi i link.
