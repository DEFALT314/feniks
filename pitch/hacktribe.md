# HackTribe – formularz „Add Project” (pole po polu, wersja po weryfikacji)

## Lista na 07:30 (#30)
- [ ] Nazwa produktu potwierdzona przez zespół (teraz „HubMI.pl”)
- [ ] Presentation: PDF z decku (https://claude.ai/artifact/EYQZ5ZeUCGXGbof2hMFh3N → Share › Export › PDF), ≤ 10 slajdów, uzupełnione [nawiasy]
- [ ] YouTube: film ≤ 3:00 jako „Niepubliczny” (scenariusz: docs/SCENARIUSZE_DEMO.md), plik MP4 zachowany
- [ ] Website: https://feniks-hub.vercel.app – sprawdzone w trybie incognito
- [ ] Makiety UX/UI: PDF albo link (P2) – w opisie albo jako dodatkowy materiał
- [ ] Code Repository: dopiero po decyzji o widoczności repo (umowa: „nie został dotychczas opublikowany”)
- [ ] Cover image: zrzut strony głównej
- [ ] Identyfikator zespołu zapisany: [__]
- [ ] Wszystko po polsku; Submit; termin 4.10 11:00

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
ROPS Kraków ma w portfolio blisko 200 przetestowanych innowacji społecznych, ale wiedza o nich jest rozproszona, a Biblioteka online (115 opisów) jest „w przebudowie”. Gmina, organizacja czy mieszkaniec z konkretnym problemem nie wie, że ktoś w Małopolsce już go rozwiązał, a ROPS nie widzi na bieżąco, jakich rozwiązań ludzie potrzebują.

## Solution
HubMI.pl: opisujesz problem własnymi słowami, a AI przypisuje go do wyzwania z Mapy Wyzwań ROPS i wskazuje do 3 sprawdzonych innowacji z Biblioteki, z uzasadnieniem i podświetlonymi słowami, które zadecydowały. AI wybiera tylko z katalogu ROPS (odpowiedź jest sprawdzana) i niczego nie publikuje bez człowieka. Wokół dopasowania budujemy wszystkie 7 modułów z zadania, na jednej platformie dla mieszkańców, NGO, gmin, ekspertów i ROPS. Projektujemy pod WCAG 2.1 AA i seniorów: duże elementy, prosty język, każda mapa także jako tabela.

## Challenges
PARTNER TASK [UMWM]: HubMi.pl

## Cover image
Opcjonalne. Później: zrzut ekranu albo makieta od P2.

## Idea stage
New Idea (projekt powstaje w całości na hackathonie)

## What's done so far and goal of your project
Projekt powstał w całości podczas HackYeah 2026. Działa na produkcji (feniks-hub.vercel.app, konta pokazowe, dane fikcyjne): dopasowanie problemu do innowacji z AI (100% trafień w top 3 na 230 zapytaniach testowych ROPS), Biblioteka 158 innowacji z wyszukiwarką, filtrami i filmami, Mapa Wyzwań, poradniki i raporty, Kreator pomysłów z kanwą i podpowiedziami AI, wysyłka pomysłu do ROPS z powiadomieniem, panel ROPS (ocena pomysłów, prośby o rolę, edycja Biblioteki, trendy potrzeb), wiadomości między ROPS, autorami i ekspertami oraz karta usługi dla gminy (Middleman).

Cel: pilotaż w ROPS Kraków – podłączenie bazy naborów, uruchomienie modeli na serwerze ROPS i przekazanie redakcji treści.

## Team status
Full team

## Current team size
4

## Needed skills / Skills comment
Puste.

## Your video presentation (YouTube)
Później (link „Niepubliczny”). Puste w drafcie.

## Website
https://feniks-hub.vercel.app

## Code Repository
UWAGA: repozytorium DEFALT314/feniks jest obecnie publiczne, a umowa przeniesienia praw wymaga oświadczenia, że utwór
„nie został dotychczas opublikowany, a jedynie udostępniony na potrzeby oceny”. Decyzja właściciela repo: zmienić na
prywatne i dać jury dostęp, albo zapytać organizatora. W drafcie można zostawić puste. Po decyzji wpisać:
https://github.com/DEFALT314/feniks

## Instructions on how to open project
Demo: https://feniks-hub.vercel.app → „Zaloguj się” → „Wejdź jako…” i wybierz konto pokazowe (mieszkaniec, organizacja, gmina, ekspertka, ROPS). Wszystkie dane są fikcyjne. Najlepsza ścieżka: „Mam problem” (dopasowanie), potem konto Fundacji (Kreator, „Wyślij do ROPS”) i konto ROPS (panel z powiadomieniem).

Lokalnie (Node 22 lub nowszy, pnpm 10 – „corepack enable”):
pnpm install
cp .env.example .env.local
pnpm dev
i otwórz http://localhost:3000. Biblioteka, karty innowacji, Mapa Wyzwań i raporty działają także bez kluczy (dane z data/rops). Dopasowanie z AI i pozostałe moduły wymagają kluczy z .env.example (Supabase, model AI, embeddingi, e-mail). Testy: pnpm test.

## Presentation
Później: PDF do 10 slajdów. Puste w drafcie.
