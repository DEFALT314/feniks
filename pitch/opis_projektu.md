# HubMI.pl – opis projektu (szkic v0 do HackTribe)

> Szkic P1. Liczby z danych w repo; [w nawiasach] to, co uzupełniamy po demo i odpowiedziach mentora.

## Pierwsze 30 słów
HubMI.pl łączy problemy społeczne Małopolski z gotowymi, przetestowanymi rozwiązaniami. Opisujesz problem własnymi
słowami, a sztuczna inteligencja wskazuje innowacje z Biblioteki ROPS, które już go rozwiązały, i mówi, dlaczego pasują.

## Problem
ROPS Kraków przetestował w inkubatorach ok. 175 innowacji społecznych, a 115 z nich opisał w Bibliotece online, która
jest „w przebudowie”. Mapa Wyzwań Społecznych wskazuje 8 obszarów i 48 kluczowych wyzwań. Gminy, organizacje
i mieszkańcy nie mają jednego miejsca, które łączy potrzebę z rozwiązaniem, pomysłodawcę z ekspertem, a ROPS
z wiedzą o tym, czego ludzie potrzebują.

## Rozwiązanie: 7 modułów, 4 grupy użytkowników
Mieszkańcy i organizacje, samorządy (JST), eksperci oraz pracownicy ROPS pracują na jednej platformie:
1. **Matchmaking społeczny**: opis problemu → obszar i wyzwanie z Mapy Wyzwań oraz do 3 innowacji z uzasadnieniem,
   cytatem i podświetlonymi słowami kluczowymi. AI wybiera tylko spośród innowacji z Biblioteki. [trafność: X% w top 3 na 230 zapytaniach testowych]
2. **Zasobnik wiedzy**: dostępna Biblioteka [158] innowacji z filtrami, Mapa Wyzwań z personami (także jako tabele), 57 raportów i publikacji ROPS.
3. **Kreator pomysłów**: kanwa innowacji społecznej krok po kroku, fiszka pomysłu, wniosek pod nabór i wizualizacja od AI.
4. **Tester innowacji**: zapis na test, ocena i uwagi dla autora.
5. **Komunikacja**: wątki z ROPS i ekspertami, powiadomienia w aplikacji i mailem.
6. **Panel administratora**: kolejka pomysłów, ocena, edycja Biblioteki bez programisty, trendy potrzeb.
7. **Middleman innowacji**: karta wdrożenia innowacji dopasowana do konkretnej gminy lub instytucji.

## AI odpowiedzialnie
AI proponuje, człowiek decyduje: każda treść ma etykietę „Propozycja AI”, nic nie jest publikowane bez kliknięcia.
Dane osobowe nie trafiają do modeli. Otwarte modele z Hugging Face (polski model embeddingów `mmlw-e5-small`)
i DeepSeek przez router zgodny z OpenAI. ROPS może je w przyszłości uruchomić na własnym serwerze.

## Dostępność
WCAG 2.1 AA: pełna obsługa klawiaturą, kontrast co najmniej 4,5:1, duża czcionka i tryb wysokiego kontrastu,
prosty język, tabele zamiast samych wykresów i map. [wynik axe/Lighthouse]

## Wdrożenie i koszt
Next.js na Vercelu, Supabase (Postgres z pgvector, region Frankfurt). Dane zostają w UE.
[koszt miesięczny w zł: z researchu + zmierzony koszt AI]. Skaluje się na całe województwo: aplikacja bez stanu,
embeddingi katalogu liczone raz, pamięć odpowiedzi AI.

## Linki
- Demo: [adres Vercel] (tryb demonstracyjny, dane fikcyjne, „Wejdź jako…”)
- Film: [MP4 ≤ 3 min] · Prezentacja: [PDF ≤ 10 slajdów] · Makiety: [PDF z Claude Design]
