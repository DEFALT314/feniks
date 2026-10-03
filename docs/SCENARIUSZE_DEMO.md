# Scenariusze demo i scenariusz filmu (P1, #27)

Stan: 3.10.2026 ok. 22:30, `main` @ 71c69b6. Produkcja: https://feniks-hub.vercel.app
Wszystkie osoby są fikcyjne: konta demo („Wejdź jako…”) i persony z Mapy Wyzwań ROPS.
Każdy scenariusz kończy się zdaniem, które mówimy jury: pokazuje, które kryterium spełniamy.

| Konto demo | Rola | Persona z Mapy Wyzwań | Moduły |
|---|---|---|---|
| Stanisław | mieszkaniec | Stanisław, 56 l., opiekuje się chorą matką (obszar Zdrowie) | I Matchmaking, II Zasobnik |
| GOPS w Przykładowej Woli | jst | gmina szukająca wsparcia dla seniorów jak Janina, 73 l. | II Biblioteka, VII Middleman |
| Fundacja Dobry Start | ngo | organizacja z pomysłem dla seniorów po szpitalu | III Kreator, V Komunikacja |
| Redakcja ROPS | rops_admin | pracownik ROPS | VI Panel, V Komunikacja, II Trendy |
| Ewa | ekspert | ekspertka wspierająca autorów | V Komunikacja |

## Przed pokazem (10 minut wcześniej)

- [ ] Otworzyć produkcję w trybie incognito; „Wejdź jako…” działa dla wszystkich 5 kont.
- [ ] Rozgrzać AI: jedno zapytanie na `/match` (pierwsze bywa wolniejsze).
- [ ] Reset danych demo (#11), jeśli ktoś wcześniej zmieniał pomysły lub role.
- [ ] Dwie karty przeglądarki: Fundacja Dobry Start i Redakcja ROPS (pokaz powiadomienia na żywo).
- [ ] Powiększenie przeglądarki 125%, żeby jury widziało tekst z sali.

## Scenariusz A: Stanisław szuka pomocy (Matchmaking, ok. 60 s)

1. Wejdź jako **Stanisław** → trafia na `/match`.
2. Wpisz własnymi słowami:
   > Opiekuję się mamą po udarze, pracuję na etacie i nie daję rady. Nie wiem, jaką pomoc może dać gmina.
3. Pokaż wynik: wyzwanie z Mapy Wyzwań, do 3 innowacji z uzasadnieniem, podświetlone słowa, etykieta „Propozycja AI”.
4. Kliknij pierwszą innowację → karta: problem, dla kogo, kto może wdrożyć, materiały, film.
5. **Zdanie dla jury:** „AI wybiera tylko spośród innowacji ROPS i mówi dlaczego. Na 230 zapytaniach testowych od ROPS trafiamy w pierwszej trójce w 100%.”

Zapasowe zapytania (gdyby AI odpowiadało wolno, `DEMO_MODE=replay` z #20):
- „Samotni seniorzy w naszej wsi rzadko wychodzą z domu.”
- „Dzieci z rodzin zastępczych potrzebują wsparcia w nauce.”
- „Osoba niewidoma nie może sama dojechać do urzędu.”

## Scenariusz B: Gmina wdraża sprawdzone rozwiązanie (Biblioteka + Middleman, ok. 45 s)

1. Wejdź jako **GOPS w Przykładowej Woli**.
2. `/library` → filtr „Dla seniorów” + „Wybrane do upowszechniania” → licznik wyników się zmienia.
3. Otwórz **Merkury** (trening obsługi bankomatu i paczkomatu) → „Odtwórz film” na karcie.
4. „Przygotuj kartę usługi” → profil instytucji → karta: dla kogo, kto prowadzi, koszty, ryzyka, pierwsze kroki → „Pobierz PDF” / wyślij do ROPS.
5. **Zdanie dla jury:** „Samorządy chciały katalogu. Gmina w kilka minut ma gotowy plan wdrożenia, zamiast wymyślać koło od nowa.”

## Scenariusz C: Pomysł trafia do ROPS i wraca odpowiedź (Kreator + Komunikacja + Panel, ok. 75 s)

To jest test „szybkości komunikacji” z kryteriów jury. Dwie karty przeglądarki obok siebie.

1. Karta 1: **Fundacja Dobry Start** → `/my/creator` → nowy pomysł „Sąsiedzki dyżur po wypisie” (wolontariusze z sąsiedztwa odwiedzają seniora przez dwa tygodnie po powrocie ze szpitala).
2. Kanwa: 2–3 kroki, po jednym pytaniu na ekran (pokazać duże przyciski).
3. „Podpowiedz” → propozycja AI → „Użyj”. Opcjonalnie „Wniosek pod nabór”.
4. „Wyślij do ROPS”.
5. Karta 2: **Redakcja ROPS** → dzwonek pokazuje nowy pomysł bez odświeżania strony → `/admin` → pomysł w kolejce.
6. Ocena: „Do poprawy” z komentarzem „Prosimy dopisać współpracę z OPS” albo „Przekaż ekspertce” (Ewa).
7. Karta 1: autor dostaje powiadomienie (i e-mail) i widzi status w „Moje pomysły”.
8. **Zdanie dla jury:** „Od kliknięcia »Wyślij« do powiadomienia w ROPS mijają sekundy, a odpowiedź wraca do autora tą samą drogą.”

## Scenariusz D: Ekspertka odpowiada (Komunikacja, ok. 20 s)

1. Wejdź jako **Ewa** → `/my/messages` → wątek przy pomyśle Fundacji → odpowiedź.
2. **Zdanie dla jury:** „Eksperci, autorzy i ROPS rozmawiają przy konkretnym pomyśle, a nie w mailach.”

## Scenariusz E: ROPS widzi region (Panel + Zasobnik, ok. 30 s)

1. **Redakcja ROPS** → zakładka „Potrzeby w regionie”: wykres według obszarów Mapy Wyzwań, ta sama tabela, kolumna „Bez dobrego dopasowania”.
2. Zakładka „Biblioteka” → edycja karty (np. poprawka opisu) → dziennik zmian.
3. Zakładka „Prośby o rolę” → zatwierdź gminę albo NGO.
4. **Zdanie dla jury:** „ROPS aktualizuje wiedzę bez programisty i widzi, gdzie w regionie brakuje rozwiązań.”

## Scenariusz F: Dostępność (ok. 15 s)

1. Przycisk „A+” w nagłówku (większa czcionka i kontrast).
2. Kilka razy Tab: widoczny fokus, „Przejdź do treści”.
3. `/challenge-map` → „Cała mapa w tabeli”.
4. **Zdanie dla jury:** „Projektujemy pod WCAG 2.1 AA i pod seniorów: klawiatura, kontrast, tabela zamiast samej mapy, prosty język.”

Tester (IV): na `main` to jeszcze zaślepka (#36). Pokazujemy dopiero, gdy P2 go skończy.

## Film MP4 – maks. 3:00 (#29, nagrania P2 #38)

Nagrania z produkcji, 1920×1080, powiększenie 125%, bez dźwięku systemowego. Lektor (P1) czyta tekst z prawej kolumny. Polskie napisy = ten sam tekst.

| Czas | Obraz | Lektor / napisy |
|---|---|---|
| 0:00–0:12 | slajd 1 (okładka) | ROPS w Krakowie ma blisko 200 sprawdzonych innowacji społecznych. Ale gmina z problemem nie wie, że ktoś już go rozwiązał. |
| 0:12–0:20 | strona główna | HubMI.pl łączy problemy z gotowymi rozwiązaniami i ludzi, którzy pomogą je wdrożyć. |
| 0:20–1:05 | scenariusz A | Stanisław opisuje problem własnymi słowami. AI wskazuje wyzwanie z Mapy Wyzwań i trzy innowacje z Biblioteki ROPS, z uzasadnieniem i słowami, które zdecydowały. Wybiera tylko z katalogu. Na 230 zapytaniach testowych od ROPS trafia w pierwszej trójce w 100%. |
| 1:05–1:25 | scenariusz B | Gmina filtruje Bibliotekę, ogląda film o innowacji i jednym kliknięciem dostaje kartę usługi: kto prowadzi, ile kosztuje, od czego zacząć. |
| 1:25–2:00 | scenariusz C | Fundacja zgłasza pomysł krok po kroku na kanwie innowacji, z podpowiedzią AI. Po kliknięciu „Wyślij do ROPS” powiadomienie pojawia się w panelu w kilka sekund. ROPS ocenia, a decyzja wraca do autora. |
| 2:00–2:10 | scenariusz D | Eksperci, autorzy i ROPS rozmawiają przy konkretnym pomyśle. |
| 2:10–2:25 | scenariusz E | ROPS aktualizuje Bibliotekę bez programisty i widzi potrzeby regionu według obszarów Mapy Wyzwań. |
| 2:25–2:38 | scenariusz F | Projektujemy pod WCAG: klawiatura, większa czcionka, tabele zamiast samych map, prosty język. |
| 2:38–2:52 | slajd 9 lub 10 | AI tylko proponuje, decyduje człowiek. Dane w Unii Europejskiej, koszt infrastruktury około 300 zł miesięcznie. |
| 2:52–3:00 | okładka + adres demo | HubMI.pl. Ktoś już to rozwiązał. Połączymy Was. |

Eksport: MP4 (H.264), ≤ 3:00, napisy wgrane w obraz. Wgrać na YouTube jako „Niepubliczny”, link do pola „YouTube” w HackTribe; plik zachować (regulamin § 4 ust. 9 wymaga MP4).

## Pitch na scenie (P1 mówi, P2 prowadzi laptopa)

1. Slajdy 1–3 (problem i rozwiązanie): 45 s.
2. Na żywo: scenariusz A (Stanisław), potem C (pomysł → ROPS → odpowiedź) na dwóch kartach.
3. Jeśli zostaje czas: B (Middleman) albo E (trendy).
4. Slajdy 9–10 (zasady AI, dostępność, wdrożenie i koszt): 30 s.
5. Awaria sieci albo AI: przełączyć na film i powiedzieć „pokażę to na nagraniu z produkcji”.

Pytania, które mogą paść:
- „Skąd wiecie, że dopasowanie jest trafne?” → test na 230 zapytaniach ROPS (100% w top 3), plus zbiory potoczne i z literówkami (98–100%), `evals/results.md`.
- „Co, jeśli AI się pomyli?” → wybiera tylko z katalogu, odpowiedź jest sprawdzana w kodzie, każdy tekst ma etykietę, decyduje człowiek.
- „Ile to kosztuje i kto to utrzyma?” → ok. 300 zł miesięcznie za infrastrukturę, część etatu redaktora w ROPS, edycja bez programisty.
- „Dane osobowe?” → tylko fikcyjne w demo; przed wysłaniem do modelu usuwamy e-maile, telefony, PESEL i numery kont; baza w UE z kontrolą dostępu według ról.
