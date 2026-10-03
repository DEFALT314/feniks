#!/usr/bin/env bash
# Tworzy w repo GitHub etykiety, kamienie milowe i issues z planem HubMI (HackYeah 2026),
# a potem dopisuje do każdego issue sekcję „Zależności” (Blokowane przez / Blokuje).
# Uruchom z folderu repo:  bash scripts/github/create_issues.sh
# Można uruchamiać wielokrotnie: istniejące issues i sekcje nie są duplikowane.
# Wymaga: GitHub CLI (brew install gh) i zalogowania (gh auth login). Działa na bash 3.2 (macOS).
set -euo pipefail

REPO="${REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
echo "Repozytorium: $REPO"

# ---------- etykiety ----------
lab() { gh label create "$1" --color "$2" --description "$3" --repo "$REPO" --force >/dev/null; }
lab "P1" "C2452B" "Radek: Treść i Zasobnik"
lab "P2" "1D6B48" "Paweł: Interfejs i Kreator"
lab "P3" "5B3FB6" "Konrad: AI i dopasowanie"
lab "P4" "1F3A8A" "Dominik: Platforma i ROPS"
lab "I matchmaking" "E8EDFA" "Moduł I"
lab "II zasobnik" "E8EDFA" "Moduł II"
lab "III kreator" "E8EDFA" "Moduł III"
lab "IV tester" "E8EDFA" "Moduł IV"
lab "V komunikacja" "E8EDFA" "Moduł V"
lab "VI panel" "E8EDFA" "Moduł VI"
lab "VII middleman" "E8EDFA" "Moduł VII"
lab "platforma" "D9DDE4" "Szkielet, logowanie, baza, CI"
lab "AI" "FFE08A" "Model językowy, embeddingi, obrazy"
lab "WCAG" "FFF1DB" "Dostępność"
lab "zgłoszenie" "FDECEA" "HackTribe, deck, film"
lab "w toku" "0E8A16" "Ktoś (i jego agent) nad tym pracuje"
lab "zablokowane" "B60205" "Czeka na coś spoza listy zależności; opis w komentarzu"
echo "Etykiety gotowe."

# ---------- kamienie milowe (czas UTC; w Polsce +2 h) ----------
ms() { gh api "repos/$REPO/milestones" -f title="$1" -f due_on="$2" -f description="$3" >/dev/null 2>&1 || true; }
ms "M1 Fundament (16:30)"            "2026-10-03T14:30:00Z" "Szkielet, logowanie, dane w bazie, kontrakty."
ms "M2 Moduły v1 (19:00)"            "2026-10-03T17:00:00Z" "Każdy z 7 modułów ma listę i szczegół na prawdziwych danych."
ms "M3 Matchmaking i komunikacja (20:00)" "2026-10-03T18:00:00Z" "Dopasowanie na żywo; pomysł → powiadomienie w panelu ROPS; szkic w HackTribe."
ms "M4 Wszystkie moduły (23:00)"     "2026-10-03T21:00:00Z" "7 modułów od początku do końca; pierwsza próba pitchu."
ms "M5 Zamrożenie funkcji (01:30)"   "2026-10-03T23:30:00Z" "Od teraz tylko błędy, dostępność, teksty."
ms "M6 Zgłoszenie (07:30)"           "2026-10-04T05:30:00Z" "PDF, film, makiety, link, opis, koszt w HackTribe."
echo "Kamienie milowe gotowe."

# ---------- pomocnicze ----------
CACHE="$(mktemp)"; trap 'rm -f "$CACHE"' EXIT
gh issue list --repo "$REPO" --state all --limit 500 --json number,title \
  --jq '.[] | "\(.number)\t\(.title)"' > "$CACHE"

get() { eval "printf '%s' \"\${$1:-}\""; }          # odczyt zmiennej o nazwie z klucza (bash 3.2)
put() { printf -v "$1" '%s' "$2"; }
KEYS=""

# issue <klucz> "<tytuł>" "<etykiety>" "<kamień milowy>" <<'EOF' treść EOF
issue() {
  local key="$1" title="$2" labels="$3" milestone="$4" body n url
  body="$(cat)"
  KEYS="$KEYS $key"; put "TITLE_$key" "$title"; put "DEPS_$key" ""
  n="$(awk -F'\t' -v t="$title" '$2==t {print $1; exit}' "$CACHE")"
  if [ -n "$n" ]; then
    echo "jest już #$n: $title"
  else
    url="$(gh issue create --repo "$REPO" --title "$title" --label "$labels" --milestone "$milestone" --body "$body")"
    n="${url##*/}"
    echo "utworzono #$n: $title"
  fi
  put "NUM_$key" "$n"
}

# blokowane <klucz> <klucze blokujących...>
blokowane() { local key="$1"; shift; put "DEPS_$key" "$*"; }

# ===== P4 Platforma i ROPS =====
issue p4_szkielet "[P4] Szkielet aplikacji: Next.js, Supabase, Vercel, CI" "P4,platforma" "M1 Fundament (16:30)" <<'EOF'
**Cel:** szkielet, na którym reszta buduje moduły. Prompt startowy: dokument „jak ruszyć”, sekcja P4.
- [ ] Next.js (App Router, TS), Tailwind, shadcn/ui, ESLint, Prettier, zod
- [ ] Strony-zaślepki wszystkich modułów, foldery jak w `CLAUDE.md`
- [ ] `lib/supabase/{server,client,service}.ts`, middleware tylko odświeża sesję
- [ ] `.env.example`, `vercel.json` z regionem `fra1`
- [ ] GitHub Actions: typecheck + lint na każdym PR
**Gotowe, gdy:** `main` działa na Vercelu, reszta zespołu zrobiła `git pull`.
EOF

issue p4_login "[P4] Logowanie kodem z maila, role i getCurrentUser()" "P4,platforma" "M1 Fundament (16:30)" <<'EOF'
- [ ] Supabase Auth: 6-cyfrowy kod z maila (`autocomplete="one-time-code"`)
- [ ] Tabela `profiles` (rola, instytucja, zgoda RODO) + trigger przy rejestracji
- [ ] Role: mieszkaniec, ngo, jst, ekspert, rops_redaktor, rops_admin (funkcja `public.moja_rola()` w `_wspolne.sql`)
- [ ] `lib/auth/getCurrentUser.ts`; layout `/admin` sprawdza rolę na serwerze
- [ ] SMTP Resend w Supabase (domyślna poczta wysyła tylko do zespołu)
**Gotowe, gdy:** logowanie działa na produkcji, `/admin` niedostępny dla mieszkańca.
EOF

issue p4_demo "[P4] Konta demo i ekran „Wejdź jako…”" "P4,platforma" "M1 Fundament (16:30)" <<'EOF'
**Makieta:** `design/makiety/Logowanie.dc.html`
- [ ] `supabase/seed_demo.sql`: 5 fikcyjnych kont (mieszkaniec, ngo, jst, ekspert, rops_admin)
- [ ] `POST /api/demo/login` tworzy prawdziwą sesję (generateLink + verifyOtp po stronie serwera)
- [ ] Działa tylko przy `DEMO_MODE=true`, w produkcji 404
- [ ] Pasek „Wersja pokazowa, dane fikcyjne”
EOF

issue p4_wspolne "[P4] Wspólne tabele: profiles, instytucje, notifications, audit_log" "P4,platforma" "M1 Fundament (16:30)" <<'EOF'
- [ ] Migracja `*_wspolne.sql` z RLS i politykami, **znacznik czasu wcześniejszy niż `202610031800`** (migracja Zasobnika P1 już używa `public.moja_rola()`)
- [ ] `public.moja_rola()` w tej migracji
- [ ] `lib/powiadomienia.ts` (dodajPowiadomienie) i `lib/audit.ts` (zapiszAudit) dla innych modułów
- [ ] Typy z bazy w `lib/supabase/types.ts`
- [ ] Kontrakty `admin.ts`, `komunikacja.ts`, `powiadomienia.ts` + fixtures
EOF

issue p4_kolejka "[P4] Panel ROPS: kolejka pomysłów i ocena" "P4,VI panel" "M2 Moduły v1 (19:00)" <<'EOF'
**Makieta:** `design/makiety/Admin.dc.html`
- [ ] Lista nowych pomysłów (z tabeli `ideas` od P2, tylko odczyt)
- [ ] Ocena we własnej tabeli `idea_reviews`: zatwierdź / do poprawy / odrzuć + komentarz dla autora
- [ ] Przypisanie eksperta do pomysłu
- [ ] Każda zmiana zapisuje `audit_log` i powiadomienie dla autora
EOF

issue p4_role "[P4] Panel ROPS: role instytucji i edycja kart innowacji" "P4,VI panel" "M2 Moduły v1 (19:00)" <<'EOF'
**Makieta:** `design/makiety/Admin.dc.html`
- [ ] Prośby o rolę jst/ngo → zatwierdzenie przez ROPS (moduł VI: weryfikacja)
- [ ] Edycja karty innowacji przez `PATCH /api/zasoby/innowacje/[id]` (endpoint P1)
- [ ] Dziennik zmian w panelu
EOF

issue p4_powiad "[P4] Powiadomienia na żywo i maile" "P4,V komunikacja" "M3 Matchmaking i komunikacja (20:00)" <<'EOF'
- [ ] Realtime: przeglądarka subskrybuje tylko swoje powiadomienia (RLS)
- [ ] Dzwonek w nagłówku (komponent P2) z licznikiem
- [ ] Mail przez Resend przy nowym pomyśle (do ROPS) i odpowiedzi (do autora)
**Gotowe, gdy:** pomysł → powiadomienie w panelu ROPS → odpowiedź wraca do autora (test szybkości komunikacji z PDF).
EOF

issue p4_komunikacja "[P4] Komunikacja: wątki ROPS, autor i ekspert" "P4,V komunikacja" "M4 Wszystkie moduły (23:00)" <<'EOF'
**Makieta:** `design/makiety/Wiadomosci.dc.html`
- [ ] Tabele `threads`, `messages` z RLS (uczestnicy widzą tylko swoje)
- [ ] Strona `/moje/wiadomosci`: lista rozmów, wątek, odpowiedź, historia statusu pomysłu
- [ ] Wiadomość „Zgłoś potrzebę do ROPS” z wyniku dopasowania
EOF

issue p4_trendy "[P4] Potrzeby w regionie: trendy według Mapy Wyzwań" "P4,VI panel" "M4 Wszystkie moduły (23:00)" <<'EOF'
**Makieta:** `design/makiety/Admin.dc.html` (sekcja trendów)
- [ ] Zgłoszenia i zapytania (`match_queries` od P3) zliczane według obszaru i wyzwania
- [ ] Wykres słupkowy + ta sama tabela (WCAG)
- [ ] Krótkie podsumowanie od P3, oznaczone „Propozycja AI”
EOF

issue p4_nabory "[P4] Nabory: lista, edycja i powiadomienie o zmianie terminu" "P4,VI panel" "M4 Wszystkie moduły (23:00)" <<'EOF'
**Zrób jako pierwsze z M4:** na tabeli `calls` czeka generator wniosków P3.
- [ ] Tabela `calls` (nazwa, url, termin_od, termin_do, obszary)
- [ ] Edycja w panelu; zmiana terminu → powiadomienie do autorów pasujących fiszek
- [ ] Opcjonalnie: import z dane.gov.pl (harmonogramy FERS)
EOF

issue p4_rls "[P4] Test uprawnień (RLS) i reset danych demo" "P4,platforma" "M5 Zamrożenie funkcji (01:30)" <<'EOF'
- [ ] Każda rola widzi tylko to, co powinna (skrypt testowy)
- [ ] Reset danych demo jednym poleceniem przed prezentacją
- [ ] Opcjonalnie: `docker-compose.yml` (aplikacja, Supabase, embedder) jako argument wdrożeniowy
EOF

# ===== P3 AI i dopasowanie =====
issue p3_hf "[P3] Usługa embeddingów na Hugging Face (prywatny Space)" "P3,AI,I matchmaking" "M1 Fundament (16:30)" <<'EOF'
- [ ] `hf-space/`: FastAPI, `POST /embed` z `sdadas/mmlw-e5-small`, prefiksy `query: ` / `passage: `
- [ ] Wymaga nagłówka z `EMBED_TOKEN`; `GET /health` do rozgrzewania
- [ ] Ping co 10 minut, żeby Space nie zasypiał
EOF

issue p3_llm "[P3] lib/ai/llm.ts: DeepSeek przez router Hugging Face" "P3,AI" "M1 Fundament (16:30)" <<'EOF'
- [ ] Klient OpenAI SDK: `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`
- [ ] `generujJSON(schemat zod, wiadomości)`: tryb JSON, walidacja, jedno ponowienie
- [ ] Pamięć odpowiedzi w tabeli `ai_cache`
- [ ] Kontrakty `match.ts`, `ai.ts`, `middleman.ts` + fixtures
EOF

issue p3_wektory "[P3] Wektory katalogu i wyzwań w bazie" "P3,AI,I matchmaking" "M2 Moduły v1 (19:00)" <<'EOF'
- [ ] Migracja `*_ai.sql`: `embeddings` (vector 384, indeks HNSW), `ai_cache`, `match_queries` (bez tekstu zapytania), `middleman_cards`
- [ ] `scripts/embed.py`: innowacje z `innovations.do_matchmakingu = true` (124 = 115 z Biblioteki + 9 pewnych spoza) + 48 wyzwań
EOF

issue p3_match "[P3] Endpoint dopasowania /api/match" "P3,AI,I matchmaking" "M3 Matchmaking i komunikacja (20:00)" <<'EOF'
- [ ] Słowa kluczowe (BM25) + wektory (pgvector) → 20 kandydatów
- [ ] DeepSeek wybiera najwyżej 3 wyłącznie z kandydatów (id albo „brak”), uzasadnienie z cytatem
- [ ] Obszar i wyzwanie z Mapy Wyzwań; podświetlone słowa, które zdecydowały
- [ ] Zapis do `match_queries`; limit 20 zapytań na godzinę na IP
EOF

issue p3_dopasuj "[P3] Strona /dopasuj" "P3,I matchmaking" "M3 Matchmaking i komunikacja (20:00)" <<'EOF'
**Makieta:** `design/makiety/Dopasuj.dc.html`
- [ ] Pole opisu, przykłady do kliknięcia, wybór roli i gminy
- [ ] Wynik: opis → wyzwanie → innowacje (wg makiety), etykieta „Propozycja AI”, `aria-live`
- [ ] Linki: karta innowacji, karta usługi dla gminy, „Zgłoś potrzebę do ROPS”
EOF

issue p3_eval "[P3] Test trafności na 230 zapytaniach" "P3,AI,I matchmaking" "M3 Matchmaking i komunikacja (20:00)" <<'EOF'
- [ ] `evals/`: dla `data/rops/gold_matchmaking.jsonl` liczy trafienie w top 3
- [ ] Cel: co najmniej 80%; poprawiamy słowa kluczowe i opisy, nie prompt
- [ ] Wynik na slajd (P1)
EOF

issue p3_kreator_ai "[P3] AI w Kreatorze: podpowiedzi, wniosek pod nabór, obraz" "P3,AI,III kreator" "M4 Wszystkie moduły (23:00)" <<'EOF'
- [ ] `/api/ai/podpowiedz`, `/api/ai/wniosek` (nabory z tabeli `calls`), `/api/ai/obraz` (model obrazów przez HF)
- [ ] AI nie wymyśla liczb ani kosztów; puste pola zostają dla użytkownika
- [ ] Gotowe obrazy do demo w Supabase Storage
EOF

issue p3_middleman "[P3] Middleman: karta usługi dla gminy" "P3,AI,VII middleman" "M4 Wszystkie moduły (23:00)" <<'EOF'
**Makieta:** `design/makiety/Middleman.dc.html`
- [ ] Strona `/moje/middleman`: wybór innowacji i instytucji (`?innowacja=<id>` z karty innowacji)
- [ ] Szkic usługi z `kto_moze_wdrozyc`, `dla_kogo` i profilu instytucji; zapis w `middleman_cards`
- [ ] Edycja, PDF, wysłanie do ROPS do konsultacji
EOF

issue p3_limity "[P3] Limity, tryb powtórki demo, etykiety „Propozycja AI”" "P3,AI" "M5 Zamrożenie funkcji (01:30)" <<'EOF'
- [ ] Limity zapytań (IP i dzienne dla zalogowanych)
- [ ] `DEMO_MODE=replay` dla ścieżek pokazywanych na scenie
- [ ] Każdy tekst z AI oznaczony; informacja o AI w stopce
EOF

# ===== P1 Treść i Zasobnik =====
issue p1_seed "[P1] Dane startowe z data/rops i tabele Zasobnika" "P1,II zasobnik" "M1 Fundament (16:30)" <<'EOF'
- [x] Migracja `202610031800_zasobnik_tabele.sql` (commit cefad1d)
- [x] `scripts/seed/build_seed.ts` → `supabase/seed.sql`: 158 innowacji (124 do Matchmakingu, 27 sprawdzonych), 8 obszarów, 48 wyzwań, 9 person, 57 zasobów
- [ ] Kontrakt `lib/contracts/zasobnik.ts` + `fixtures/zasobnik.json` do 16:30
- [ ] Migracja przechodzi na Supabase po `_wspolne.sql` od P4 (`moja_rola()`)
Plan P1: `docs/P1_PLAN.md`.
EOF

issue p1_pytania "[P1] Pytania do mentora ROPS" "P1" "M1 Fundament (16:30)" <<'EOF'
- [ ] Co składa się na „200+” innowacji? Czy dostaniemy pełne karty MIIS i IWS 2.0?
- [ ] Zgoda na użycie treści Biblioteki i kanwy INNO AGH w aplikacji
- [ ] Czy w demo możemy pokazywać nazwy instytucji-autorów?
- [ ] Które liczby z raportu o sektorze opiekuńczym (2026) są dla ROPS najważniejsze?
Odpowiedzi wpisać do docu z planem.
EOF

issue p1_biblioteka "[P1] Biblioteka: lista z filtrami i wyszukiwaniem" "P1,II zasobnik" "M2 Moduły v1 (19:00)" <<'EOF'
**Makieta:** `design/makiety/Biblioteka.dc.html`
- [ ] `/biblioteka`: kategorie, „wybrane do upowszechniania”, film, PDF; wyszukiwanie po nazwie i słowach
- [ ] Rekordy spoza Biblioteki z oznaczeniem „opis niepełny”
EOF

issue p1_karta "[P1] Karta innowacji i endpoint edycji" "P1,II zasobnik" "M2 Moduły v1 (19:00)" <<'EOF'
**Makieta:** `design/makiety/Karta.dc.html`
**Zrób przed 18:00:** na endpoincie edycji czeka panel ROPS (P4).
- [ ] `/biblioteka/[id]`: opis, problem, dla kogo, kto wdraża, czy działa, materiały, link do karty ROPS
- [ ] Przyciski: karta usługi (Middleman), pytanie do ROPS
- [ ] `PATCH /api/zasoby/innowacje/[id]` tylko dla ról ROPS
EOF

issue p1_mapa "[P1] Mapa Wyzwań i zasoby" "P1,II zasobnik" "M2 Moduły v1 (19:00)" <<'EOF'
**Makieta:** `design/makiety/MapaWyzwan.dc.html`
- [ ] `/mapa-wyzwan`: 8 obszarów, wyzwania, persony, wersja tabelaryczna
- [ ] `/zasoby`: 51 raportów i 6 publikacji z tagami i filtrem roku
EOF

issue p1_opis "[P1] Opis projektu i szkic zgłoszenia w HackTribe" "P1,zgłoszenie" "M3 Matchmaking i komunikacja (20:00)" <<'EOF'
- [ ] Opis: pierwsze 30 słów mówi wszystko, dalej 7 modułów, AI, dostępność, koszt
- [ ] Szkic zapisany w HackTribe do 20:00
EOF

issue p1_teksty "[P1] Mikroteksty prostym językiem i scenariusze demo" "P1,WCAG" "M4 Wszystkie moduły (23:00)" <<'EOF'
- [ ] Teksty ekranów prostym językiem (wysłać właścicielom modułów)
- [ ] Scenariusze demo na personach z Mapy Wyzwań (np. Stanisław, Janina)
- [ ] Pierwsza próba pitchu o 23:00
EOF

issue p1_deck "[P1] Deck 10 slajdów i koszt utrzymania" "P1,zgłoszenie" "M6 Zgłoszenie (07:30)" <<'EOF'
- [ ] 10 slajdów wg planu (problem, 7 modułów, AI, dostępność, wdrożenie, koszt)
- [ ] Koszt utrzymania w złotych + potrzebne zasoby (zakładka „Wdrożenie i rozwój”)
- [ ] Wynik trafności i wynik axe/Lighthouse na slajdach
EOF

issue p1_film "[P1] Film MP4 do 3 minut" "P1,zgłoszenie" "M6 Zgłoszenie (07:30)" <<'EOF'
- [ ] Montaż z nagrań P2 wg scenariusza (0:00–0:20 problem, 0:20–1:10 dopasowanie, 1:10–2:20 pozostałe moduły, 2:20–2:45 dostępność, AI, koszt)
- [ ] Polskie napisy; gotowy do 06:00
EOF

issue p1_zgloszenie "[P1] Kompletne zgłoszenie w HackTribe" "P1,zgłoszenie" "M6 Zgłoszenie (07:30)" <<'EOF'
- [ ] PDF do 10 slajdów, film MP4, makiety (PDF), link do demo, opis, koszt utrzymania
- [ ] Wszystko wysłane o 07:30, potem tylko podmiana plików
EOF

# ===== P2 Interfejs i Kreator =====
issue p2_makiety "[P2] Makiety i system wizualny w kodzie" "P2,WCAG" "M1 Fundament (16:30)" <<'EOF'
**Makieta:** `design/makiety/System.dc.html` (kolory, typografia, komponenty); źródło: artefakt Claude Design „HubMI.pl – makiety”
- [ ] Eksport makiet do PDF (do zgłoszenia)
- [ ] Tokeny w Tailwind: granat #1F3A8A, cegła #C2452B, zieleń #1D6B48, tło #F6F7F9, tekst #151A23
- [ ] Fonty: Bricolage Grotesque (nagłówki), Atkinson Hyperlegible Next (tekst)
EOF

issue p2_komponenty "[P2] Komponenty UI i układ strony" "P2,WCAG" "M1 Fundament (16:30)" <<'EOF'
**Makieta:** `design/makiety/System.dc.html`, `design/makiety/Naglowek.dc.html`, `design/makiety/Stopka.dc.html`
**Zrób jako pierwsze:** na tych komponentach budują P1, P3 i P4.
- [ ] Przycisk, karta, pole formularza z etykietą i błędem, kroki, kafelek wyboru, etykiety
- [ ] Nagłówek (nawigacja, A+, dzwonek, użytkownik), stopka z deklaracją dostępności i informacją o AI
- [ ] `lang="pl"`, link „Przejdź do treści”, widoczny fokus
EOF

issue p2_strona "[P2] Strona główna i wygląd logowania" "P2" "M2 Moduły v1 (19:00)" <<'EOF'
**Makieta:** `design/makiety/Main.dc.html`, `design/makiety/Logowanie.dc.html`
- [ ] `/`: hasło, trzy wejścia (mam problem / mam pomysł / chcę poznać), dane ROPS, zasada AI
- [ ] Wygląd `/logowanie` i „Wejdź jako…” (logika od P4)
EOF

issue p2_kreator "[P2] Kreator: kroki kanwy i fiszka" "P2,III kreator" "M2 Moduły v1 (19:00)" <<'EOF'
**Makieta:** `design/makiety/Kreator.dc.html`, `design/makiety/Fiszka.dc.html`
**Zrób przed 18:00:** na tabeli `ideas` czekają panel ROPS i nabory (P4) oraz Tester.
- [ ] Migracja `*_kreator_tester.sql` (ideas, idea_canvas, tests, test_signups, test_ratings) z RLS
- [ ] Kroki z `data/rops/canvas_innowacji.json`: jedno pole = jeden ekran, zapis po każdym kroku
- [ ] Fiszka: tytuł, opis, istota, dla kogo, etap; „Moje pomysły” ze statusem
EOF

issue p2_kreator_ai "[P2] Kreator: przyciski AI i wysłanie do ROPS" "P2,III kreator" "M4 Wszystkie moduły (23:00)" <<'EOF'
**Makieta:** `design/makiety/Fiszka.dc.html`
- [ ] „Podpowiedz”, „Wniosek pod nabór”, „Pokaż wizualizację” na endpointach P3 (wcześniej fixtures)
- [ ] „Wyślij do ROPS” ustawia `wyslany_at` i woła `dodajPowiadomienie`
- [ ] „Coś podobnego już działa” z wyniku dopasowania
EOF

issue p2_tester "[P2] Tester innowacji" "P2,IV tester" "M4 Wszystkie moduły (23:00)" <<'EOF'
**Makieta:** `design/makiety/Tester.dc.html`
- [ ] Lista testów, zapis i wypisanie się
- [ ] Ocena 1–5, co działało, co poprawić; uwagi trafiają do autora
EOF

issue p2_wcag "[P2] Przegląd WCAG wszystkich modułów" "P2,WCAG" "M5 Zamrożenie funkcji (01:30)" <<'EOF'
- [ ] Test axe w CI na głównych trasach
- [ ] Klawiatura, kontrast, etykiety, powiększenie 200%, ekran 320 px
- [ ] Zgłoszenia do właścicieli modułów; wynik Lighthouse na slajd
EOF

issue p2_nagrania "[P2] Nagrania ekranu do filmu" "P2,zgłoszenie" "M6 Zgłoszenie (07:30)" <<'EOF'
- [ ] Nagrania z produkcji wg scenariusza P1 (01:30–03:00)
- [ ] Każdy z 7 modułów co najmniej 10 sekund
EOF

# ===== zależności: blokowane <zadanie> <co je blokuje...> =====
blokowane p4_login       p4_szkielet
blokowane p4_demo        p4_login p4_wspolne
blokowane p4_wspolne     p4_szkielet
blokowane p4_kolejka     p4_login p4_wspolne p2_kreator
blokowane p4_role        p4_login p1_karta
blokowane p4_powiad      p4_wspolne p2_komponenty
blokowane p4_komunikacja p4_powiad
blokowane p4_trendy      p3_wektory p1_seed
blokowane p4_nabory      p4_wspolne p2_kreator
blokowane p4_rls         p1_seed p4_kolejka p4_komunikacja p2_tester p3_middleman
blokowane p3_llm         p4_szkielet
blokowane p3_wektory     p3_hf p1_seed
blokowane p3_match       p3_wektory p3_llm
blokowane p3_dopasuj     p3_match p2_komponenty
blokowane p3_eval        p3_match
blokowane p3_kreator_ai  p3_llm p4_nabory
blokowane p3_middleman   p3_llm p1_seed p4_wspolne
blokowane p3_limity      p3_match p3_kreator_ai p3_middleman
blokowane p1_seed        p4_wspolne
blokowane p1_biblioteka  p1_seed p2_komponenty
blokowane p1_karta       p1_seed p2_komponenty p4_login
blokowane p1_mapa        p1_seed p2_komponenty
blokowane p1_deck        p3_eval p2_wcag
blokowane p1_film        p2_nagrania
blokowane p1_zgloszenie  p1_deck p1_film p1_opis p2_makiety
blokowane p2_komponenty  p4_szkielet p2_makiety
blokowane p2_strona      p2_komponenty p4_demo
blokowane p2_kreator     p2_komponenty p4_login
blokowane p2_kreator_ai  p2_kreator p3_kreator_ai p3_match
blokowane p2_tester      p2_kreator
blokowane p2_wcag        p3_dopasuj p1_biblioteka p2_kreator_ai p2_tester p4_komunikacja p4_kolejka p3_middleman
blokowane p2_nagrania    p2_wcag p1_teksty

# ---------- sekcja „Zależności” w każdym issue + natywne zależności GitHub ----------
pozycja() { printf -- '- #%s %s\n' "$(get "NUM_$1")" "$(get "TITLE_$1")"; }
NATYWNE=1
for k in $KEYS; do
  n="$(get "NUM_$k")"
  body="$(gh issue view "$n" --repo "$REPO" --json body -q .body)"
  case "$body" in *"## Zależności"*) echo "#$n ma już zależności"; continue;; esac

  przez=""; for d in $(get "DEPS_$k"); do przez="$przez$(pozycja "$d")"$'\n'; done
  blokuje=""; for o in $KEYS; do
    case " $(get "DEPS_$o") " in *" $k "*) blokuje="$blokuje$(pozycja "$o")"$'\n';; esac
  done
  [ -n "$przez" ] || przez=$'- nic, można zaczynać od razu\n'
  [ -n "$blokuje" ] || blokuje=$'- nic\n'

  sekcja="## Zależności
**Blokowane przez:**
${przez}
**Blokuje (ktoś na to czeka):**
${blokuje}
> Blokada jeszcze otwarta? Nie czekaj: pracuj na fixtures z \`lib/contracts/fixtures/\` i podmień je, gdy blokada się zamknie.
> Blokuje Cię coś spoza tej listy: komentarz w tym issue, etykieta \`zablokowane\`, wiadomość do właściciela.
> Zamknięcie: PR z \`Closes #$n\`."
  gh issue edit "$n" --repo "$REPO" --body "$body

$sekcja" >/dev/null
  echo "#$n: dopisano zależności"

  if [ "$NATYWNE" = 1 ]; then
    for d in $(get "DEPS_$k"); do
      id="$(gh api "repos/$REPO/issues/$(get "NUM_$d")" --jq .id)"
      if ! gh api -X POST "repos/$REPO/issues/$n/dependencies/blocked_by" -F issue_id="$id" >/dev/null 2>&1; then
        NATYWNE=0; echo "(natywne zależności GitHub niedostępne; zostaje sekcja w treści)"; break
      fi
    done
  fi
done

echo "Gotowe: https://github.com/$REPO/issues"
