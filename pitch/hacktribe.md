# HackTribe – formularz „Add Project” (pole po polu, wersja po weryfikacji)

Draft do soboty 20:00, finał do niedzieli 11:00. Jeden Team Leader = jeden projekt: zakłada go jedna osoba, reszta
dołącza linkiem z zaproszeniem. Wymagane w finale (regulamin § 4 ust. 9): opis, PDF do 10 slajdów, MP4 do 3 minut;
zadanie ROPS wymaga też linku do demo, makiet UX/UI i kosztu utrzymania.

Weryfikacja (3.10): liczby zgodne z data/rops i treścią zadania; statystyki z Mapy Wyzwań są ogólnopolskie; wybór AI
jest walidowany względem listy kandydatów (lib/ai/matching/rerank.ts); filtr danych osobowych: e-mail, PESEL,
telefon, numer konta (lib/ai/privacy.ts). Repozytorium jest publiczne – patrz „Code Repository”.

## Project Name
HubMI.pl – Małopolski Hub Innowacji Społecznych

## Published
Bez znaczenia na tym etapie (organizator). Zostaw zaznaczone.

## Problem
ROPS Kraków od 10 lat testuje innowacje społeczne i ma ich w portfolio blisko 200, ale wiedza o nich jest rozproszona. Biblioteka Innowacji online opisuje 115 z nich i jest „w przebudowie”. Mapa Wyzwań Społecznych wskazuje 8 obszarów i 48 kluczowych wyzwań społecznych. Przytacza m.in. dane ogólnopolskie: w 2023 r. ubóstwo skrajne dotyczyło 6,6% gospodarstw domowych (wzrost o 2 pp., GUS), wskaźnik zatrudnienia osób z niepełnosprawnością w wieku 16–64 lata wynosił 30,1% (GUS), a liczba dzieci w pieczy zastępczej wzrosła o 3,5% (GUS). Seniorzy mierzą się m.in. z samotnością, chorobami i wykluczeniem cyfrowym.

Gminy, organizacje i mieszkańcy Małopolski tworzą wartościowe rozwiązania, ale nie mają jednego miejsca, które łączy diagnozę problemu, rozwój pomysłu, testowanie i upowszechnianie sprawdzonych innowacji. Gmina szukająca rozwiązania nie wie, że inna gmina już je przetestowała, a ROPS nie widzi na bieżąco, jakich rozwiązań ludzie potrzebują najbardziej.

## Solution
HubMI.pl to „cyfrowe serce” Małopolskiego Hubu Innowacji Społecznych. Użytkownik opisuje problem własnymi słowami, a sztuczna inteligencja przypisuje go do obszaru i wyzwania z Mapy Wyzwań i wskazuje do 3 innowacji z Biblioteki ROPS, z uzasadnieniem i podświetlonymi słowami kluczowymi. AI wybiera wyłącznie spośród innowacji z Biblioteki (odpowiedź jest sprawdzana względem katalogu), nie wymyśla nowych.

Siedem modułów dla mieszkańców i NGO, samorządów, ekspertów i pracowników ROPS:
1. Matchmaking społeczny – dopasowanie problemu do innowacji.
2. Zasobnik wiedzy – Biblioteka 158 innowacji z wyszukiwarką, filtrami i linkami do filmów, Mapa Wyzwań z personami, 57 raportów i publikacji ROPS.
3. Kreator pomysłów – kanwa innowacji krok po kroku, fiszka pomysłu, wniosek pod aktywny nabór, wizualizacja od AI.
4. Tester innowacji – zapis na test, ocena i uwagi dla autora.
5. Komunikacja – wątki z ROPS i ekspertami, powiadomienia w aplikacji i mailem.
6. Panel ROPS – ocena pomysłów, edycja Biblioteki bez programisty, trendy potrzeb według Mapy Wyzwań.
7. Middleman innowacji – karta usługi dopasowana do konkretnej gminy lub instytucji.

Korzyści: gmina w kilka minut znajduje sprawdzone rozwiązanie zamiast wymyślać je od nowa, autor pomysłu dostaje szybką odpowiedź od ROPS, a ROPS widzi trendy potrzeb w regionie. AI tylko proponuje, a decyduje człowiek. Przed wysłaniem tekstu do modelu automatycznie usuwamy e-maile, telefony, numery PESEL i numery kont. Interfejs projektujemy zgodnie z WCAG 2.1 AA, z myślą o seniorach i osobach z niepełnosprawnościami. Aplikacja i baza danych działają w UE (Frankfurt), a modele AI mają otwarte wagi, więc ROPS może je w przyszłości uruchomić na własnym serwerze. Szacowany koszt infrastruktury: ok. 300 zł miesięcznie przy ok. 2000 zapytań.

## Challenges
PARTNER TASK [UMWM]: HubMi.pl

## Cover image
Opcjonalne. Później: zrzut ekranu albo makieta od P2.

## Idea stage
New Idea (projekt powstaje w całości na hackathonie)

## What's done so far and goal of your project
Projekt powstaje w całości podczas HackYeah 2026. Gotowe: dane startowe z materiałów ROPS (158 innowacji, 8 obszarów i 48 wyzwań Mapy Wyzwań, 9 person, 57 raportów i publikacji), schemat bazy danych z politykami dostępu według ról, Biblioteka innowacji z wyszukiwarką i filtrami, karty innowacji, Mapa Wyzwań, raporty i publikacje, dopasowanie problemu do innowacji z AI (endpoint i strona), makiety UX/UI i komponenty interfejsu. W toku: logowanie i konta demonstracyjne, Kreator pomysłów, Tester, komunikacja z powiadomieniami, panel ROPS i Middleman.

Cel na koniec hackathonu: wszystkie 7 modułów działa od początku do końca w wersji demo na fikcyjnych danych, z trafnością dopasowania co najmniej 80% w top 3 na 230 zapytaniach testowych.

## Team status
Full team

## Current team size
4

## Needed skills / Skills comment
Puste.

## Your video presentation (YouTube)
Później (link „Niepubliczny”). Puste w drafcie.

## Website
Później: adres demo z Vercela. Puste w drafcie.

## Code Repository
UWAGA: repozytorium DEFALT314/feniks jest obecnie publiczne, a umowa przeniesienia praw wymaga oświadczenia, że utwór
„nie został dotychczas opublikowany, a jedynie udostępniony na potrzeby oceny”. Decyzja właściciela repo: zmienić na
prywatne i dać jury dostęp, albo zapytać organizatora. W drafcie można zostawić puste. Po decyzji wpisać:
https://github.com/DEFALT314/feniks

## Instructions on how to open project
Lokalnie (Node 22 lub nowszy, pnpm 10 – „corepack enable”):
pnpm install
cp .env.example .env.local
pnpm dev
i otwórz http://localhost:3000. Biblioteka, karty innowacji, Mapa Wyzwań i raporty działają także bez kluczy (dane z data/rops). Dopasowanie z AI i pozostałe moduły wymagają kluczy z .env.example (Supabase, model AI, embeddingi, e-mail). Testy: pnpm test.

## Presentation
Później: PDF do 10 slajdów. Puste w drafcie.
