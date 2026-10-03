# Mikroteksty prostym językiem (P1, #27)

Przegląd tekstów ekranów pod kątem prostego języka (senior, osoba z niepełnosprawnością, bez żargonu).
Stan: 3.10.2026 ok. 23:00. Ekrany P1 są już poprawione (PR z tym plikiem). Poniżej propozycje dla
właścicieli pozostałych ekranów: obecny tekst → proponowany. Właściciel decyduje i zmienia u siebie.

## Wspólne nazwy (prośba do wszystkich)

| Zamiast | Piszemy | Uwagi |
|---|---|---|
| „Wybrana do upowszechniania” | **„Sprawdzona przez ROPS”** | odznaka, filtr, liczby na stronie głównej (P1 już zmienił) |
| „fiszka” | **„karta pomysłu”** | Kreator, Wiadomości, panel |
| „kanwa innowacji” w przyciskach | **„pytania o pomysł”** | nazwę „kanwa innowacji” zostawiamy tylko w opisie i słowniczku |
| „Wyślij do ROPS” (6 miejsc) | **„Wyślij pomysł / wiadomość / prośbę / kartę usługi do ROPS”** | przycisk zawsze z przedmiotem |
| „model językowy”, „Asystent AI” | **„Propozycja AI”** (etykieta) i „AI” w zdaniach | jedna etykieta w całej aplikacji |
| „Kreator pomysłów” / „generator wniosków” | **„Kreator pomysłu”**, **„szkic wniosku”** | |
| skróty GOPS, OPS, JST bez wyjaśnienia | pełna nazwa przy pierwszym użyciu | np. „GOPS (gminny ośrodek pomocy społecznej)” |

## P2: strona główna, Kreator, logowanie, nagłówek i stopka, profil

- `app/page.tsx:44` – „Kreator przeprowadzi mnie krok po kroku przez kanwę innowacji i przygotuje fiszkę dla ROPS.” → „Odpowiem na proste pytania, a kreator przygotuje opis mojego pomysłu dla ROPS.”
- `app/page.tsx:82`, `:224` – „wybrane do upowszechniania” → „sprawdzone przez ROPS” (wspólna nazwa).
- `app/page.tsx:106` – zdanie ok. 20 słów z „wdrożyć” → „Pokażemy sprawdzone rozwiązania z Małopolski i pomożemy je uruchomić u Was.”
- `app/my/creator/_components/wizard.tsx:76/78/89/131` – „Kanwa innowacji”, „Części kanwy”, „Podgląd fiszki”, „Przejdź do fiszki” → „Pytania o pomysł”, „Części pytań”, „Podgląd karty pomysłu”, „Przejdź do podsumowania”.
- `app/my/creator/_components/my-ideas.tsx:24` → „Kreator zadaje po jednym pytaniu. Na końcu powstaje karta pomysłu, którą możesz wysłać do ROPS.”
- `my-ideas.tsx:65/79`, `new-idea-form.tsx:27` – „Kanwa: 3 z 12 pytań”, „Dokończ kanwę”, „Zacznij kanwę” → „Pytania: 3 z 12”, „Dokończ odpowiedzi”, „Zacznij opisywać pomysł”.
- `card-form.tsx:89,113-114` – „Fiszka”, pole „Istota” → „Karta pomysłu”, „Najważniejsze w jednym zdaniu”.
- `submit-panel.tsx:87` – „Wyślij do ROPS” → „Wyślij pomysł do ROPS”; `:40` → „Najpierw zapisz kartę. Uzupełnij zaznaczone pola.”
- `application-draft.tsx:65` – „Wniosek pod nabór” → „Szkic wniosku o pieniądze”; `:121` → „To szkic do poprawy. Uzupełnij fragmenty w nawiasach [ ]. AI nie zna Twoich liczb.”
- `states.tsx:23` – „Pomysł jest w ROPS. Możesz go czytać, ale nie zmieniać.” → „ROPS ocenia Twój pomysł. Na razie możesz go tylko czytać.”
- `ai-hints.tsx:78` → „AI podpowie lepsze sformułowania. Nic się nie zmieni bez Twojej zgody.”
- `app/login/page.tsx:51` – dopisać krok: „… Odśwież stronę i spróbuj jeszcze raz.”
- `components/ui/site-header.tsx:36` → „To wersja pokazowa. Wszystkie osoby są fikcyjne.”
- `components/ui/site-footer.tsx:13` → „Napis „Propozycja AI” oznacza, że tekst przygotowała sztuczna inteligencja. Decyduje człowiek.”

## P3: dopasowanie (/match), Middleman

- `match-form.tsx:98` – „Pytam jako” → „Kim jesteś?”
- `match-result.tsx:114` – „Kto wdraża” → „Kto może to wprowadzić”.
- `match-result.tsx:121,132` – dwa linki „Zobacz kartę” w jednej karcie → zostawić jeden; „Przygotuj dla mojej gminy” → „Przygotuj plan dla mojej gminy”.
- `match-result.tsx:153,161` – „Inne innowacje, które mogą pasować”, „… AI ich nie oceniała.” → „Inne rozwiązania, które mogą pasować”, „Znalazła je wyszukiwarka. AI ich nie sprawdzało.”
- `match-result.tsx:270` – „Zgłoś potrzebę” → „Zgłoś brakujące rozwiązanie”; `:264` → „Napisz do ROPS, czego brakuje. To pomoże zaplanować kolejne nabory.”
- `match-result.tsx:274` – zdanie ok. 25 słów → trzy krótkie: „AI wybiera tylko z Biblioteki ROPS. Twojego opisu nie zapisujemy. Do statystyk trafia tylko obszar.”
- `ai-progress.tsx:36` → „Poniżej pierwsze wyniki. Za chwilę AI wybierze najlepsze i wyjaśni dlaczego.”
- `app/my/middleman/page.tsx:34`, `workbench.tsx:121` → „Z gotowego rozwiązania robisz plan usługi dla gminy: kto, za ile, od czego zacząć. Ty decydujesz, co zostaje.”
- `workbench.tsx:270` – „Wyślij do ROPS do konsultacji” → „Wyślij kartę usługi do ROPS i poproś o radę”.
- `workbench.tsx:71` – przykład „GOPS w Przykładowej Woli” → dopisać „(gminny ośrodek pomocy społecznej)”.

## P4: panel ROPS (kolejka, nabory), Wiadomości

- `app/admin/_components/review-form.tsx:30` – „Wymagana przy „Do poprawy” i „Odrzuć”.” → „Napisz ją, gdy prosisz o poprawki albo odrzucasz pomysł.”; `:35` „Ekspert” → „Ekspert do pomocy (nieobowiązkowo)”.
- `app/admin/calls/_components/call-form.tsx:27` – „Identyfikator” / „Małe litery i myślniki” → „Krótka nazwa w adresie strony”.
- `app/admin/calls/page.tsx:39` – „generatorze wniosków” → „szkicu wniosku w Kreatorze” (wspólna nazwa).
- `app/my/messages/page.tsx:113` – „Popraw fiszkę” → „Popraw kartę pomysłu”.
- `app/my/messages/_components/reply-form.tsx:36` – „Wyślij” → „Wyślij odpowiedź”.
- `app/my/messages/_components/new-thread-form.tsx:34` – „Wyślij do ROPS” → „Wyślij wiadomość do ROPS”.
- `app/my/messages/new/page.tsx:25` → „Zadaj pytanie albo opisz potrzebę. Odpowiemy i w razie potrzeby zaprosimy eksperta.”
- Sprawdzić pusty stan listy wiadomości: „Nie masz jeszcze wiadomości. Napisz do ROPS, jeśli masz pytanie.”
