# P1 · Treść i Zasobnik – plan pracy

Stan: 3.10.2026, po `git pull` (main = ca57556). Kodu aplikacji jeszcze nie ma, szkielet robi P4.
Zasada: **każde zadanie zaczynamy od `git pull`** (na gałęzi: `git pull` na main + `git rebase main`).

## Moje foldery (CLAUDE.md)
`app/biblioteka/`, `app/mapa-wyzwan/`, `app/zasoby/`, `app/api/zasoby/`, `scripts/seed/`, `supabase/seed.sql`,
`docs/`, `pitch/`, migracja `supabase/migrations/<YYYYMMDDHHMM>_zasobnik_tabele.sql`,
`lib/contracts/zasobnik.ts` + `lib/contracts/fixtures/zasobnik.json`.

## Co wiemy o danych (sprawdzone)
| Plik | Zawartość | Uwagi do seedu |
|---|---|---|
| `biblioteka.json` | 9 kategorii, 115 innowacji | `etykieta` ≠ null u 27 → to „Sprawdzona przez ROPS”; `autor_instytucja` wypełnione u 65; `materialy` = {opis_pdf, film, pakiet_zip, zasady_wykorzystania, inne[]} |
| `biblioteka_spoza.json` | 43 innowacje | dodatkowe pola: `spoza_biblioteki`, `program`, `zrodlo`, `pewnosc` (pewne/prawdopodobne). brak pola `do_matchmakingu` → reguła: `pewnosc = 'pewne'` (9 rekordów, notatki „Jakość opisów”); 6 rekordów ma kategorię `inne` → dodana 10. kategoria „Inne” |
| `mapa_wyzwan.json` | 8 obszarów, 48 wyzwań | obszar: id, nr, nazwa, definicja, dane[] (tekst), kluczowe_wyzwania[{id, tekst}], persona{imie, opis, cele[], wyzwania[], motywacje[]} (w `zdrowie-psychiczne` tablica 2 person → razem 9), slowa_kluczowe[], kategorie_biblioteki[] |
| `raporty_i_publikacje.json` | 51 raportów + 6 publikacji | raport: id, rok, tytul, tagi[], priorytet_dla_demo, url; publikacja: id, rok, tytul, opis, url, moduly[] |

## Etap 0 – teraz, bez szkieletu (do ok. 16:00)
✅ Zrobione: migracja `202610031800_zasobnik_tabele.sql` + `scripts/seed/build_seed.ts` → `seed.sql` (158 innowacji, 124 do Matchmakingu, 27 sprawdzonych, 8 obszarów, 48 wyzwań, 9 person, 57 zasobów; test na Postgres 16 w Dockerze, seed 2× bez błędów).
1. ~~Pytania do mentora ROPS~~ (decyzja zespołu: P1 nie rozmawia z mentorami; pytania zostają w `docs/PYTANIA_MENTOR_ROPS.md` (rozmowa na żywo, odpowiedzi do docu z planem):
   skąd „200+” i czy dostaniemy pełne karty MIIS i IWS 2.0; zgoda na treść Biblioteki i kanwę INNO AGH;
   czy pokazywać instytucje-autorów; najważniejsze liczby z raportu o sektorze opiekuńczym (2026); nazwa produktu.
2. **Migracja** `supabase/migrations/<data>_zasobnik_tabele.sql`:
   - `innovations` (id text PK = slug, pola z JSON, `text[]` dla tablic, `materialy jsonb`, `sprawdzona_przez_rops bool`
     z `etykieta`, `spoza_biblioteki`, `do_matchmakingu`, `program`, `zrodlo`, `pewnosc`, `opublikowana`, `updated_at`),
   - `innovation_categories` (9 kategorii z biblioteka.json; potrzebne do filtrów),
   - `challenge_areas`, `challenges` (FK do obszaru), `personas` (1 na obszar), `resources` (typ raport|publikacja, tagi[], rok, priorytet),
   - RLS: SELECT dla wszystkich (anon też), gdy `opublikowana`; zapis tylko `moja_rola() in ('rops_redaktor','rops_admin')`.
   - ⚠️ `public.moja_rola()` dopisze P4 w `_wspolne.sql`. Moja migracja musi mieć **późniejszy znacznik czasu**.
3. **`scripts/seed/build_seed.ts`** (`npx tsx scripts/seed/build_seed.ts`) → `supabase/seed.sql`:
   na początku `delete from` (kolejność zgodna z FK), escapowanie `'` → `''`, tablice `ARRAY[...]::text[]`, `jsonb`.
   Sprawdzenie: liczby rekordów (115 + 43, 8, 48, 8 lub 9 person, 57 zasobów), unikalne id, test na lokalnym Supabase albo `psql`.
4. Commity prosto na `main` (decyzja P1), zawsze po `git pull`.

## Etap 1 – po szkielecie P4 (ok. 16:00–19:00)
✅ Zrobione: `/biblioteka`, `/biblioteka/[id]`, `PATCH /api/zasoby/innowacje/[id]`, `/mapa-wyzwan`, `/zasoby`; vitest i testy (`pnpm test`).
Strony działają też bez bazy: bez zmiennych Supabase dane idą wprost z `data/rops`.
1. ✅ `lib/contracts/zasobnik.ts` + `lib/contracts/fixtures/zasobnik.json` (generuje `npx tsx scripts/seed/build_fixtures.ts`), sprawdzone zod i `tsc --strict`.
2. `/biblioteka`: filtry (kategoria, grupa docelowa, program/etykieta, „Sprawdzona przez ROPS”), wyszukiwanie po nazwie
   i słowach kluczowych, licznik wyników, filtry w URL (searchParams, Server Component), dopisek „opis niepełny” dla rekordów spoza.
3. `/biblioteka/[id]`: opis, problem, dla kogo, kto może wdrożyć, czy działa, materiały, „Zobacz pełną kartę w ROPS”,
   „Dopasuj do mojej gminy” → `/moje/middleman?innowacja=<id>`.
4. `/mapa-wyzwan`: 8 obszarów → obszar: definicja, dane, wyzwania, persona, powiązane innowacje (przez `kategorie_biblioteki`);
   każdy widok także jako tabela.
5. `/zasoby`: raporty i publikacje, tagi, filtr roku, linki do źródeł.
6. `PATCH /api/zasoby/innowacje/[id]`: zod, `getCurrentUser()`, rola ROPS, klient z sesją (RLS), `zapiszAudit`.
Komponenty z `components/ui` (P2), a dopóki ich nie ma, czysty shadcn. Prosty język, WCAG.
**Spotkanie 17:00:** dane w bazie, kontrakt w repo.

## Etap 2 – treść i zgłoszenie (19:00–23:30)
- 19:00–20:00: opis projektu (pierwsze 30 słów mówi wszystko) i **szkic w HackTribe przed 20:00**; scenariusze demo na personach
  (Janina 73 l., Swietłana, Krystian…).
- 20:00–23:00: mikroteksty do ekranów dla właścicieli, deck v1 (10 slajdów wg PLAN_HUBMI.md), scenariusz filmu 3 min,
  tabela kosztu utrzymania (P3 poda zmierzony koszt AI). Wspólnie z P3: poprawki `slowa_kluczowe`, jeśli Matchmaking < 80%.
- 23:00 próba pitchu, **sen 23:30–03:30**.

## Etap 3 – noc i rano
- 03:30–06:00 montaż filmu z nagrań P2 (MP4 ≤ 3 min, polskie napisy), PDF ≤ 10 slajdów, koszt.
- **07:30 kompletne zgłoszenie** (tytuł, opis, PDF, MP4, link do demo, makiety P2, koszt, zrzuty).
- 07:30–10:30 próby pitchu po polsku (P1 mówi).

## Subagenci (research bez zużywania kontekstu głównej sesji)
| Kiedy | Agent | Zadanie | Wynik |
|---|---|---|---|
| ✅ | Explore (haiku) | Które rekordy `biblioteka_spoza.json` naprawdę mają pełny opis, a które tylko nazwę? Zestawienie z `biblioteka_spoza_notatki.md` | lista id → `do_matchmakingu` |
| teraz | general-purpose (sonnet) | Sprawdzić linki `url`/`materialy` (status HTTP, skrypt, bez czytania treści) | lista martwych linków |
| ok. 19:00 | general-purpose + WebSearch | Aktualne cenniki Vercel Pro, Supabase Pro, HF Spaces CPU, Resend, kurs USD/PLN | tabela kosztu do decku |
| ok. 19:00 | general-purpose + WebSearch | Wymagania zgłoszenia HackYeah 2026 / HackTribe (pola, limity plików) | checklista |
| 20:00 | Plan | Szkic decku 10 slajdów + scenariusz filmu z danych repo | `pitch/deck.md`, `pitch/film.md` |
Zasada: subagent zwraca tylko wnioski (≤ 30 linii), a nie zawartość plików.

## Ryzyka
- `moja_rola()` jeszcze nie istnieje → migracja nie przejdzie bez `_wspolne.sql` P4. Kolejność znaczników czasu.
- P3: w `scripts/embed.py` filtrować spoza po `pewnosc == 'pewne'` (w JSON nie ma `do_matchmakingu`) albo czytać kolumnę `innovations.do_matchmakingu`.
- Nazwy instytucji-autorów: do decyzji mentora; do tego czasu w kolumnie, ale bez pokazywania w UI (flaga).
