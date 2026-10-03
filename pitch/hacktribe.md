# HackTribe – formularz „Add Project” (pole po polu)

Draft do soboty 20:00, finał do niedzieli 11:00. Jeden Team Leader = jeden projekt: zakłada go jedna osoba, reszta
dołącza linkiem z zaproszeniem. Wymagane w finale (regulamin § 4 ust. 9): opis, PDF do 10 slajdów, MP4 do 3 minut.

## Project Name
HubMI.pl – Małopolski Hub Innowacji Społecznych

## Published
Bez znaczenia na tym etapie (organizator). Zostaw zaznaczone.

## Problem
ROPS Kraków od 10 lat testuje innowacje społeczne i ma ich w portfolio blisko 200, ale wiedza o nich jest rozproszona. Biblioteka Innowacji online opisuje 115 z nich i jest „w przebudowie”. Mapa Wyzwań Społecznych wskazuje 8 obszarów i 48 kluczowych wyzwań Małopolski, m.in.: ubóstwo skrajne dotyczy 6,6% gospodarstw domowych (wzrost o 2 pp. w 2023 r., GUS), wskaźnik zatrudnienia osób z niepełnosprawnością to 30,1% (GUS 2023), rośnie liczba dzieci w pieczy zastępczej (+3,5% w 2023 r.), a seniorzy najczęściej mierzą się z samotnością, chorobami i wykluczeniem cyfrowym.

Gminy, organizacje i mieszkańcy tworzą wartościowe rozwiązania, ale nie mają jednego miejsca, które łączy diagnozę problemu, rozwój pomysłu, testowanie i upowszechnianie sprawdzonych innowacji. Gmina szukająca rozwiązania nie wie, że inna gmina już je przetestowała, a ROPS nie widzi na bieżąco, jakich rozwiązań ludzie potrzebują najbardziej.

## Solution
HubMI.pl to „cyfrowe serce” Małopolskiego Hubu Innowacji Społecznych. Użytkownik opisuje problem własnymi słowami, a sztuczna inteligencja przypisuje go do obszaru i wyzwania z Mapy Wyzwań i wskazuje do 3 sprawdzonych innowacji z Biblioteki ROPS, z uzasadnieniem i podświetlonymi słowami kluczowymi. AI wybiera wyłącznie spośród prawdziwych innowacji, nie wymyśla nowych.

Siedem modułów dla mieszkańców i NGO, samorządów, ekspertów i pracowników ROPS:
1. Matchmaking społeczny – dopasowanie problemu do innowacji.
2. Zasobnik wiedzy – dostępna Biblioteka 158 innowacji z filtrami i filmami, Mapa Wyzwań z personami, 57 raportów i publikacji ROPS.
3. Kreator pomysłów – kanwa innowacji krok po kroku, fiszka pomysłu, wniosek pod aktywny nabór, wizualizacja od AI.
4. Tester innowacji – zapis na test, ocena i uwagi dla autora.
5. Komunikacja – wątki z ROPS i ekspertami, powiadomienia w aplikacji i mailem.
6. Panel ROPS – ocena pomysłów, edycja Biblioteki bez programisty, trendy potrzeb według Mapy Wyzwań.
7. Middleman innowacji – karta usługi dopasowana do konkretnej gminy lub instytucji.

Korzyści: gmina w kilka minut znajduje sprawdzone rozwiązanie zamiast wymyślać je od nowa, autor pomysłu dostaje szybką odpowiedź od ROPS, a ROPS widzi trendy potrzeb w regionie. AI tylko proponuje, a decyduje człowiek; dane osobowe nie trafiają do modeli. Interfejs projektujemy zgodnie z WCAG 2.1 AA, z myślą o seniorach i osobach z niepełnosprawnościami. Otwarte modele z Hugging Face i dane w UE; koszt utrzymania ok. 300 zł miesięcznie.

## Challenges
PARTNER TASK [UMWM]: HubMi.pl

## Cover image
Opcjonalne. Później: zrzut ekranu strony głównej albo makieta od P2.

## Idea stage
New Idea

## What's done so far and goal of your project
Projekt powstaje w całości podczas HackYeah 2026. Gotowe: dane startowe z materiałów ROPS (158 innowacji, 8 obszarów i 48 wyzwań Mapy Wyzwań, 9 person, 57 raportów i publikacji), baza danych z kontrolą dostępu według ról, Biblioteka innowacji z wyszukiwarką i filtrami, karty innowacji, Mapa Wyzwań, raporty, makiety UX/UI i system wizualny. W toku: matchmaking z AI, Kreator pomysłów, Tester, komunikacja z powiadomieniami, panel ROPS i Middleman.

Cel na koniec hackathonu: wszystkie 7 modułów działa od początku do końca w wersji demo na fikcyjnych danych, z trafnością matchmakingu co najmniej 80% w top 3 na 230 zapytaniach testowych.

## Team status
Full team

## Current team size
4

## Needed skills / Skills comment
Nic nie zaznaczaj, zostaw puste.

## Your video presentation (YouTube)
Później (link „Niepubliczny” na YouTube). Puste w drafcie.

## Website
Później: adres demo z Vercela. Puste w drafcie.

## Code Repository
https://github.com/DEFALT314/feniks

## Instructions on how to open project
Wersja demo: [adres Vercel] – tryb demonstracyjny z kontami „Wejdź jako…”, dane fikcyjne.

Lokalnie (Node 22, pnpm):
pnpm install
cp .env.example .env.local
pnpm dev
i otwórz http://localhost:3000. Biblioteka, karty innowacji, Mapa Wyzwań i raporty działają także bez kluczy (dane z data/rops). Pozostałe moduły wymagają kluczy Supabase i Hugging Face w .env.local. Testy: pnpm test.

## Presentation
Później: PDF do 10 slajdów (deck). Puste w drafcie.
