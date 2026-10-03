# HubMI.pl – plan na dziś według oficjalnego zadania

Oct 3, 2026 · @Pablo praca

## Co mówi PDF i co to zmienia

Oficjalne zadanie nagradza **liczbę działających modułów**: obowiązkowy matchmaking daje 10%, a każdy z sześciu kolejnych modułów po 5%. Razem to 40% oceny. Dlatego budujemy **wszystkie 7 modułów** jako działające MVP, a matchmaking najstaranniej. Ten dokument zastępuje wcześniejszy plan „Gmina Gminie” tam, gdzie się różnią.

| Kryterium | Waga | Jak zdobywamy punkty |
| --- | --- | --- |
| Stopień spełnienia wyzwania | 40% | Matchmaking 10% + 6 modułów po 5%; liczy się też jakość działania |
| Potencjał wdrożeniowy | 20% | Skalowalność na całe województwo, integracje (baza grantowa, powiadomienia), niski koszt utrzymania, prostota |
| Dostępność i intuicyjność | 20% | WCAG 2.1 AA, seniorzy i osoby z niepełnosprawnościami, prosty interfejs |
| Atrakcyjność i jakość interfejsu | 10% | Nieszablonowe podejście i ładne makiety UX/UI |
| Jakość materiałów i MVP | 10% | PDF, film, opis, działające demo |

Ocena: każde kryterium w skali 1–10, laureat musi zdobyć co najmniej 50%. Nagrody: 6000, 5000 i 4000 zł. Prezentacja przed jury po polsku.

**Co się zmienia względem naszego planu**

- **JST chcą katalogu.** PDF mówi wprost, że samorządy oczekują narzędzia, które „działa jak katalog”. Biblioteka i wyszukiwanie wracają do produktu jako moduł „Zasobnik wiedzy”, a nie są już tabu.
- **Trafność jest testowana na słowach kluczowych** z opisu potrzeby. Matchmaking ma pokazywać, które słowa dopasował, a nie tylko wynik.
- **Testują szybkość komunikacji:** jak administrator dowiaduje się o nowym pomyśle i jak wygląda odpowiedź do autora. To musi być widoczne w demo.
- **Użytkownicy są czterej:** mieszkańcy i NGO, JST, pracownicy ROPS (administratorzy) oraz eksperci branżowi (doradzają innowatorom i JST).
- **Zgłoszenie wymaga** nazwy i opisu, PDF do 10 slajdów, filmu MP4 do 3 minut (regulamin żąda obu), linku do demo, makiet UX/UI oraz przewidywanego kosztu utrzymania z opisem zasobów. Wszystko po polsku, do niedzieli 11:00.
- **ROPS da materiały:** mapę wyzwań społecznych z linkami do raportów, link do Biblioteki, materiały o doświadczeniach ROPS, plansze Canw Innowacji Społecznych i przykładowe dane. Odbierzcie je od mentorów od razu.
- **Zakaz prawdziwych danych osobowych.** Wszystkie osoby w demo są fikcyjne.
- **Prawa autorskie:** laureat przenosi na PROIDEA majątkowe prawa autorskie wraz z kodem źródłowym i oświadcza, że dzieło nie było wcześniej opublikowane. Repo trzymajcie prywatne (szczegóły w sekcji o zgłoszeniu).

## Produkt: 7 modułów

Jedna aplikacja z przełącznikiem ról na górze (Mieszkaniec lub NGO, JST, Ekspert, ROPS), bez logowania i na fikcyjnych danych. Każdy moduł ma działać od początku do końca, nawet jeśli jest prosty. Pusty ekran „wkrótce” nie daje punktów.

| Moduł | Punkty | Co działa w MVP | AI | Kto | Gotowe do |
| --- | --- | --- | --- | --- | --- |
| **I. Matchmaking społeczny** (obowiązkowy) | 10% | Opis problemu własnymi słowami, gmina i rola. Wynik: podobne zgłoszenia z bazy potrzeb, 3 innowacje z Biblioteki z uzasadnieniem i podświetlonymi słowami kluczowymi, przyciski „Zapytaj eksperta” i „Dodaj do mapy potrzeb” | Embeddingi z Hugging Face i wyszukiwanie po słowach kluczowych; Claude wybiera i uzasadnia tylko spośród znalezionych pozycji | P3 (UI: P2) | 17:00 |
| **II. Zasobnik wiedzy** | 5% | Mapa wyzwań Małopolski z danych ROPS (tabela i mapa), Biblioteka innowacji jako katalog z filtrami, wyszukiwarką i filmami, materiały edukacyjne. Dla administratora: trendy potrzeb, czyli zgłoszenia zagregowane według obszarów | Claude streszcza trend w 2 zdaniach | P1 (trendy: P4) | 20:00 |
| **III. Kreator pomysłów** | 5% | Fiszka pomysłu (opis, istota, dla kogo, etap), interaktywna Canwa Innowacji Społecznych na podstawie plansz ROPS, generator wniosku do aktywnego naboru, asystent kreatora z wizualizacją przedmiotu | Claude pisze wniosek i podpowiada; obraz z modelu na Hugging Face | P2 (AI: P3) | 23:00 |
| **IV. Tester innowacji** | 5% | „Chcę testować”, ocena innowacji (gwiazdki i komentarz), propozycja usprawnienia; podsumowanie opinii dla administratora | Claude streszcza opinie | P2 i P4 | 21:00 |
| **V. Platforma aktywnej komunikacji** | 5% | Wątki pytań do ROPS i ekspertów przy każdym zgłoszeniu, pomyśle i innowacji; powiadomienia w aplikacji i mailem (administrator dostaje nowy pomysł od razu, autor dostaje odpowiedź); tablica „Szukam partnera” | Brak, ewentualnie szkic odpowiedzi do akceptacji | P4 | 20:00 |
| **VI. Panel administratora** | 5% | Kolejka nowych zgłoszeń i pomysłów (zatwierdź, odrzuć z uzasadnieniem, przekaż ekspertowi), edycja Biblioteki i materiałów w formularzu bez programisty, włączanie naborów, trendy | Claude podpowiada kategorię i duplikaty | P4 | 19:00 |
| **VII. Middleman Innowacji** | 5% | Instytucja wybiera innowację i opisuje siebie (typ, wielkość gminy, kadra, budżet). Dostaje „kartę usługi”: zakres, kadra, koszty, harmonogram, ryzyka, co dostosować; do pobrania jako PDF | Claude na podstawie opisu innowacji i profilu instytucji | P3 (UI: P2) | 22:00 |

**Zasada dla całego AI:** AI proponuje, człowiek decyduje. Każda treść od AI ma etykietę „Propozycja AI”, a nic nie jest wysyłane ani publikowane bez kliknięcia człowieka. Matchmaking nie może wymyślić innowacji spoza Biblioteki.

**Nazwa:** robocza „Gmina Gminie” (hasło „Ktoś już to rozwiązał. Połączymy Was.”). Zadanie wymaga nazwania produktu i nazw modułów, więc decyzję zamknijcie do 13:30 z mentorką ROPS.

## AI i Hugging Face

PDF nie wymaga Hugging Face, tylko „rozwiązania wykorzystującego sztuczną inteligencję”. Hugging Face ma jednak sens w trzech miejscach. Daje otwarte modele, które ROPS może kiedyś uruchomić u siebie, a to punktuje w „potencjale wdrożeniowym” (koszt, prostota, brak uzależnienia od dostawcy). Tekst piszemy Claude'em, bo najlepiej trzyma polszczyznę i format odpowiedzi.

| Zadanie | Model | Gdzie działa | Koszt | Po co |
| --- | --- | --- | --- | --- |
| Dopasowanie po znaczeniu i grupowanie potrzeb | Polski `sdadas/mmlw-e5-small` (zapas: `intfloat/multilingual-e5-small`) | Darmowy Hugging Face Space (CPU) z jednym endpointem `POST /embed`; katalog liczony raz offline | 0 zł | Rozumie „samotni seniorzy” i „osoby starsze bez opieki” jako to samo |
| Dopasowanie po słowach kluczowych | BM25 (MiniSearch) w kodzie, z polską normalizacją (bez ogonków, przycięte końcówki) | W aplikacji | 0 zł | Jury testuje trafność właśnie po słowach kluczowych; pokazujemy, które słowa się dopasowały |
| Wybór i uzasadnienie, wnioski, karta usługi, asystent, streszczenia | Claude: Haiku 4.5 do prostych zadań, Sonnet 5.5 do wyboru i dłuższych tekstów; odpowiedzi w schemacie, pamięć odpowiedzi | API Anthropic | Około 30–80 $ za dobę, limit 100 $ | Najlepsza polszczyzna i stabilny format |
| Wizualizacja przedmiotu w asystencie kreatora | Model tekst→obraz przez Hugging Face Inference Providers (np. FLUX.1-schnell) | Hugging Face | Darmowe konto ma 0,10 $ kredytu na miesiąc, PRO (9 $ miesięcznie) ma 2 $; gotowe obrazy zapisujcie w Supabase Storage | PDF wprost wymienia „wizualizację innowacyjnego przedmiotu” |
| Dyktowanie zamiast pisania (opcjonalnie) | `openai/whisper-large-v3-turbo` przez Hugging Face albo Web Speech API w przeglądarce | Hugging Face albo przeglądarka | Grosze albo 0 zł | Dostępność dla seniorów |
| Ścieżka na pilotaż (tylko w pitchu) | Polski model Bielik (SpeakLeash) z Hugging Face | Serwer ROPS | Koszt sprzętu | Dane zostają w urzędzie |

**Jak działa matchmaking, krok po kroku**

1. Reguła w kodzie usuwa dane osobowe (PESEL, telefon, e-mail), zanim tekst trafi do jakiegokolwiek modelu.
2. Słowa kluczowe i embeddingi dają po 20 kandydatów; wyniki łączycie (fuzja rang) w jedną listę.
3. Claude wybiera do 3 innowacji wyłącznie spośród kandydatów (identyfikator z listy albo „brak”) i pisze „dlaczego pasuje” z cytatem z opisu innowacji.
4. Ekran: przy każdej innowacji dopasowane słowa kluczowe, źródło, film i przycisk kontaktu; obok podobne zgłoszenia z bazy potrzeb.
5. Brak dopasowania: „Dodaj do mapy potrzeb” i „Zapytaj eksperta”, a potrzeba trafia do trendów administratora.

**Hugging Face Space w 30 minut (P3):** konto i token, nowy Space typu Docker albo Gradio na darmowym CPU, `sentence-transformers` z modelem i prefiksami `query:` oraz `passage:` (tak wymaga rodzina e5), jeden endpoint zwracający wektor. Space zasypia po dłuższym braku ruchu, więc przed pokazem zróbcie zapytanie rozgrzewające. Źródła: [PL-MTEB, polski ranking embeddingów](https://arxiv.org/html/2405.10138v2), [model mmlw-e5-small](https://huggingface.co/sdadas/mmlw-e5-small), [darmowe kredyty Inference](https://klymentiev.com/blog/huggingface-inference-api), [limit PRO](https://discuss.huggingface.co/t/pro-account-2-inference-limit/143929/4).

## Podział na 4 osoby

Każda osoba ma swoje moduły i foldery, a wspólne są tylko kontrakty danych i komponenty UI. Wszyscy pracują w Claude Code, każda sesja w osobnym `git worktree`. Makiety w Claude Design robi P2, bo są wymaganym elementem zgłoszenia.

| Osoba | Moduły i zadania | Foldery | Narzędzia |
| --- | --- | --- | --- |
| **P1 · Treść, dane i opowieść** (prezentuje) | Odbiór materiałów od ROPS i zamiana ich na dane (Biblioteka, mapa wyzwań, materiały edukacyjne, Canwy). Moduł II Zasobnik wiedzy. Fikcyjne dane demo (zgłoszenia, pomysły, osoby). Nazwy produktu i modułów. Kontakt z mentorami, szkic HackTribe o 20:00, koszt utrzymania, PDF, scenariusz i montaż filmu, pitch | `data/`, `app/(modules)/knowledge-base/`, `docs/` | Claude Code, Claude (deck i teksty) |
| **P2 · Projekt i interfejs** | Makiety wszystkich 7 modułów w Claude Design do 13:30 (eksport PDF do zgłoszenia). System projektowy, powłoka z przełącznikiem ról, WCAG. Ekrany modułów I, III, IV i VII na API od P3 i P4. Nagrania ekranu do filmu | `components/`, `app/(modules)/{matchmaking,creator,tester,middleman}/` | Claude Design, Claude Code |
| **P3 · AI** | Space na Hugging Face z embeddingami, embeddingi katalogu, API matchmakingu, generator wniosków, karta usługi (Middleman), asystent kreatora z obrazem, streszczenia trendów i opinii, test trafności na słowach kluczowych | `packages/ai/`, `app/api/{match,application,middleman,assistant,summary}/`, `hf-space/`, `evals/` | Claude Code, API Claude, Hugging Face |
| **P4 · Platforma i komunikacja** (integrator) | Repo, CI, Vercel, Supabase (schemat, dane startowe, reset), logika ról. Moduł VI Panel administratora (kolejka, edycja Biblioteki, nabory, trendy), moduł V Komunikacja (wątki, powiadomienia w aplikacji i mailem), zapis ocen w module IV. Scalanie i wdrożenia | `app/api/` (reszta), `app/(modules)/{admin,messages}/`, `supabase/`, `packages/contracts/` | Claude Code |

**Role na scenie:** mówi P1, P2 prowadzi laptopa, P4 jest w odwodzie technicznym, a P3 odpowiada na pytania o AI.

**Sen w zmianach:** P1 23:30–03:30, P3 01:30–05:30, P4 03:00–07:00, P2 03:30–07:30. Między 03:00 a 05:30 nikt niczego nie scala.

**Wspólne zasady Claude Code:** `CLAUDE.md` z poprzedniego dokumentu (zakładka „Do wklejenia”) z poprawionymi folderami jak wyżej. Kontrakty danych zamrożone o 13:30, potem wolno je tylko rozszerzać. Zależności dodaje tylko P4. PR-y do 300 linii, scalane w ciągu godziny.

## Plan godzinowy

Cztery punkty synchronizacji (13:30, 17:00, 20:00, 23:00), na których wszystko musi działać na adresie produkcyjnym. Każdy trwa 10 minut przy laptopie P4: najpierw pokaz, potem rozmowa.

| Godzina | P1 · treść | P2 · interfejs | P3 · AI | P4 · platforma |
| --- | --- | --- | --- | --- |
| 12:00–12:45 | Teaser ROPS; odbiór materiałów od mentorów (mapa wyzwań, Biblioteka, Canwy, przykładowe dane); pytania o nazwę i publiczne repo | Claude Design: system projektowy, makiety modułów I, II i VI | Space na Hugging Face z embeddingami; plan API matchmakingu | Repo, Next.js, Supabase, Vercel; schemat bazy dla 7 modułów; przełącznik ról |
| 12:45–13:30 | Materiały ROPS zamienione na CSV/JSON (Biblioteka, co najmniej 30 pozycji; mapa wyzwań); fikcyjne dane demo | Makiety III, IV, V i VII, stany ekranów, wersja 375 px | Embeddingi katalogu, wyszukiwanie po słowach kluczowych | Kontrakty zod i dane przykładowe, CI, pierwsze wdrożenie |
| **13:30** | **Synchronizacja 1:** makiety zamrożone i przekazane do Claude Code, kontrakty zamrożone, szkielet na produkcji |  |  |  |
| 13:30–15:00 | Zasobnik: Biblioteka jako katalog z filtrami i filmami, mapa wyzwań | Powłoka i nawigacja 7 modułów, ekran matchmakingu na danych przykładowych | `/api/match` od początku do końca | Panel administratora: kolejka i edycja Biblioteki |
| 15:00–17:00 | Materiały edukacyjne; nazwy modułów; 20 testowych opisów z oczekiwanymi innowacjami | Matchmaking podłączony do API; kreator: fiszka pomysłu | Uzasadnienia z cytatem, podobne zgłoszenia, pierwszy test trafności | Komunikacja: wątki i powiadomienie administratora o nowym pomyśle |
| **17:00** | **Synchronizacja 2:** matchmaking działa na produkcji, każdy z 7 modułów ma przynajmniej listę i szczegół |  |  |  |
| 17:00–19:45 | Szkic w HackTribe do 19:45: tytuł, 150 słów, obraz, PDF z 3 slajdami, link | Tester (ocena, zapis do testów), interaktywna Canwa | Generator wniosku do naboru, karta usługi (Middleman) | Mail do autora po odpowiedzi, włączanie naborów, trendy (zapytanie i wykres) |
| **20:00** | **Szkic w HackTribe obowiązkowy**, kolacja |  |  |  |
| 20:00–23:00 | Koszt utrzymania, deck v1, scenariusz filmu 3 min | Ekrany Middlemana i asystenta, przejście WCAG z axe | Asystent kreatora (Claude i obraz z Hugging Face), streszczenia trendów i opinii | Zapis ocen, reset demo, utwardzenie, uprawnienia ról |
| **23:00** | **Synchronizacja 3:** wszystkie 7 modułów działa od początku do końca na produkcji; P1 robi pierwszą próbę pitchu |  |  |  |
| 23:00–01:30 | Sen od 23:30 | Dopracowanie, stany, 1920×1080 | Drugi test trafności, pamięć odpowiedzi na demo | Błędy i wydajność; **01:30 zamrożenie funkcji** |
| 01:30–03:30 | Sen | Nagrania ekranu do filmu, poprawki wizualne | Sen od 01:30 | Lighthouse i axe, dane demo, kopia bazy; sen od 03:00 |
| 03:30–07:00 | Montaż filmu MP4 (do 3 min), PDF do 10 slajdów, opis, koszt | Sen do 07:30 | Od 05:30 zastępca integratora, liczby trafności do decku | Sen do 07:00 |
| **07:00–07:30** | **Koniec zmian w kodzie o 07:00; zgłoszenie kompletne w HackTribe o 07:30** |  |  |  |
| 07:30–10:30 | Próby pitchu po polsku (z zespołem, z obcą osobą, z awarią) | Prowadzi laptopa na próbach | Linki ze zgłoszenia w trybie incognito | Ostatnie wdrożenie o 09:00, dyżur |
| **11:00** | **Termin zgłoszeń.** Godziny finałów sprawdźcie w agendzie |  |  |  |

## Stos, hosting i koszt utrzymania

Na hackathon wszystko poza modelami AI jest darmowe. Koszt utrzymania w produkcji jest wymaganym elementem zgłoszenia, więc P1 wpisuje tabelę niżej do PDF i opisu, a P3 podmienia szacunki AI na koszt zmierzony z logów.

**Na hackathon**

| Warstwa | Wybór | Koszt |
| --- | --- | --- |
| Aplikacja | Next.js (App Router), TypeScript, Tailwind i shadcn/ui na Vercelu (Pro na 14-dniowym okresie próbnym, region Frankfurt), adres `nazwa.vercel.app` | 0 $ |
| Baza, pliki, powiadomienia na żywo | Supabase (Frankfurt): Postgres, Storage na obrazy, Realtime na powiadomienia w module V | 0 $ |
| Embeddingi | Hugging Face Space na darmowym CPU | 0 $ |
| Obrazy w asystencie | Hugging Face Inference Providers | 0–9 $ (PRO, jeśli darmowe 0,10 $ się skończy) |
| Teksty AI | API Claude z limitem 100 $ | Około 30–80 $ |
| Maile | Resend na darmowym planie, wysyłka na skrzynkę zespołu | 0 $ |

**Koszt utrzymania w produkcji (szacunek do zgłoszenia)**

Założenie: całe województwo, około 2000 zapytań matchmakingu i 300 wniosków lub kart usług miesięcznie.

| Pozycja | Wariant chmurowy | Wariant na serwerze ROPS lub UMWM |
| --- | --- | --- |
| Aplikacja | Vercel Pro, 20 $ miesięcznie | Kontener Docker na istniejącym serwerze |
| Baza | Supabase Pro, 25 $ miesięcznie | Postgres na tym samym serwerze |
| Embeddingi | Płatny CPU na Hugging Face albo ten sam serwer | Ten sam serwer, model ma około 0,5 GB |
| Teksty AI | \[zmierzony koszt jednego zapytania\] × wolumen, rzędu kilkudziesięciu do 150 $ miesięcznie | Bielik na serwerze z GPU albo ten sam dostawca |
| Maile | Resend do 3000 miesięcznie za darmo | Serwer pocztowy urzędu |
| Ludzie | 0,25 etatu redaktora treści w ROPS (Biblioteka, moderacja), 0,1 etatu administratora IT, eksperci według potrzeb | Tak samo |

W pitchu podajcie jedną liczbę miesięczną w złotych, policzoną po aktualnym kursie, i powiedzcie, że koszt AI zmierzyliście w demo. Skalowalność: aplikacja bez stanu, baza z indeksami, embeddingi liczone raz dla katalogu, a pamięć odpowiedzi zmniejsza liczbę wywołań AI. Integracje: API dla bazy grantowej i powiadomienia o nowych pomysłach oraz zmianach w naborach (wymaganie z punktu 5 PDF).

## WCAG 2.1 AA

Dostępność to 20% oceny, a PDF wprost wymienia seniorów i osoby z niepełnosprawnościami. P2 pilnuje tego od pierwszej makiety, a P4 dodaje test axe do CI.

- [ ] Kontrast tekstu co najmniej 4,5:1, elementów interfejsu 3:1; kolor nigdy nie jest jedynym nośnikiem informacji.
- [ ] Cała aplikacja działa z klawiatury, z widocznym fokusem i linkiem „Przejdź do treści”.
- [ ] Każde pole formularza ma etykietę, błędy są opisane tekstem i powiązane z polem.
- [ ] `lang="pl"`, nagłówki w porządku h1–h3, punkty orientacyjne (`header`, `nav`, `main`).
- [ ] Tekst bazowy co najmniej 16 px; układ działa przy powiększeniu 200% i na ekranie 320 px bez przewijania w poziomie.
- [ ] Przycisk „Większa czcionka i wysoki kontrast” w nagłówku, z myślą o seniorach.
- [ ] Obrazy mają tekst alternatywny, także obrazy z asystenta kreatora (opis generuje AI, a zatwierdza człowiek).
- [ ] Filmy w Bibliotece mają napisy albo transkrypcję.
- [ ] Mapa wyzwań ma równoważną tabelę („Pokaż jako tabelę”).
- [ ] Odpowiedzi AI i nowe powiadomienia są ogłaszane czytnikom ekranu raz, przez `aria-live="polite"`, bez strumieniowania tekstu.
- [ ] Cele dotykowe co najmniej 44 px, respektowane `prefers-reduced-motion`.
- [ ] Język prosty: krótkie zdania, bez żargonu i angielskich słów w interfejsie.
- [ ] W stopce: Deklaracja dostępności i informacja o użyciu AI.
- [ ] Przed 01:30 wynik Lighthouse i axe na trasach ze sceny, a zmierzoną liczbę wpiszcie na slajd.

## Zgłoszenie

Zgłoszenie wysyłacie w HackTribe po polsku, kompletne o 07:30, a nie o 10:55. Zadanie dopuszcza PDF albo film, ale regulamin wymaga obu, więc robicie jedno i drugie.

- [ ] Tytuł projektu i identyfikator zespołu.
- [ ] Opis projektu: pierwsze 30 słów mówi wszystko, dalej 7 modułów, AI, dostępność i koszt.
- [ ] PDF, najwyżej 10 slajdów.
- [ ] Film MP4, najwyżej 3 minuty, z polskimi napisami.
- [ ] Link do działającego demo, bez logowania, z przełącznikiem ról.
- [ ] Makiety UX/UI: eksport z Claude Design do PDF plus link.
- [ ] Przewidywany koszt utrzymania i opis potrzebnych zasobów (tabela z sekcji o hostingu).
- [ ] Zrzuty ekranu i, jeśli trzeba, dostęp do repozytorium (o tym poniżej).

**Deck: 10 slajdów**

1. Nazwa, hasło, zrzut ekranu.
2. Problem w liczbach ROPS (115 innowacji w Bibliotece, która jest „w przebudowie”, 48 wyzwań na Mapie Wyzwań, brak miejsca, które to łączy).
3. Rozwiązanie: 7 modułów i 4 grupy użytkowników na jednym schemacie.
4. Matchmaking: opis, dopasowane słowa kluczowe, innowacje z uzasadnieniem.
5. Zasobnik wiedzy i Kreator pomysłów (fiszka, Canwa, wniosek, wizualizacja).
6. Tester, Komunikacja i Panel administratora: jak administrator dowiaduje się o pomyśle i jak wraca odpowiedź.
7. Middleman: karta usługi dla konkretnej gminy.
8. AI i bezpieczeństwo danych: kto decyduje, brak danych osobowych, otwarte modele z Hugging Face.
9. Dostępność (zmierzony wynik), skalowalność, integracje i koszt utrzymania.
10. Zespół, źródła, co działa w demo, a co jest koncepcją.

**Film do 3 minut:** 0:00–0:20 problem, 0:20–1:10 matchmaking na żywo, 1:10–2:20 po 10 sekund na każdy z pozostałych 6 modułów, 2:20–2:45 dostępność, AI i koszt, 2:45–3:00 nazwa i hasło. Nagrania ekranu z produkcji robi P2 w nocy, montaż P1 do 06:00.

**Prawa autorskie i repo.** Laureat przenosi na PROIDEA majątkowe prawa autorskie razem z kodem źródłowym i oświadcza w umowie, że dzieło nie było wcześniej opublikowane, a jedynie udostępnione do oceny. Dlatego:

- repo zostaje prywatne; jury dostaje zaproszenie albo spakowany kod;
- o 12:00 zapytajcie mentorów, czy publiczny link do repo jest dla nich w porządku;
- używajcie tylko bibliotek na licencjach MIT, Apache albo BSD, bez cudzych grafik i tekstów bez zgody;
- materiały ROPS wykorzystujecie za ich zgodą i podpisujecie źródło;
- nie dodawajcie pliku LICENSE.

## Ryzyka i kolejność cięcia

Zasada: lepiej 7 modułów, które działają od początku do końca na prostych danych, niż 3 dopieszczone. Każdy moduł daje +5% w największym kryterium, ale tylko jeśli da się go pokazać w demo.

| Ryzyko | Po czym poznamy | Co robimy | Kto |
| --- | --- | --- | --- |
| Za szeroki zakres, nic nie jest skończone | o 20:00 mniej niż 4 moduły klikalne na produkcji | tniemy według listy niżej, nie dokładamy nowych rzeczy | P4 (integrator) decyduje, P1 pilnuje listy |
| Space na Hugging Face zasypia (zimny start 30–60 s) | pierwsze zapytanie po przerwie trwa długo | ping co 10 min z crona Vercel, a przed demo ręczne rozgrzanie; awaryjnie wektory katalogu policzone wcześniej i tylko BM25 dla zapytania | P3 |
| Kończą się darmowe kredyty na obrazy w HF | błąd 402 albo limit z Inference Providers | obrazy do demo wygenerowane wcześniej i zapisane w Supabase Storage; awaryjnie szkic SVG od Claude | P3 |
| Claude API wolne albo limit | odpowiedź > 8 s albo błąd 429 | cache odpowiedzi + tryb `DEMO_MODE=replay` dla ścieżek z demo; limit wydatków $100 | P3 |
| Dopasowanie trafia źle | test na 230 zapytaniach z data/rops/gold\_matchmaking.jsonl daje < 80% trafień w top 3 | poprawiamy opisy w katalogu i słowa kluczowe, a nie prompt; pokazujemy podświetlone słowa kluczowe | P1 + P3 |
| Braki w WCAG | axe w CI zgłasza błędy, klawiatura gdzieś utyka | poprawki przed 01:30; po freeze tylko poprawki dostępności | P2 |
| Konflikty w repo w nocy | czerwone CI, rozjechane schematy | zakaz merge 03:00–05:30, zmiany w schemacie tylko przez P4 | P4 |
| Spóźnione zgłoszenie | o 07:30 brakuje czegoś z listy | kompletne zgłoszenie o 07:30, potem już tylko podmiana plików | P1 |
| Słaba sieć w hali | strona ładuje się wolno na scenie | dwa hotspoty z telefonów, nagrany film jako zapas, demo na produkcji i lokalnie | P4 |
| Prawa autorskie i dane | ktoś wrzuca cudzy kod albo prawdziwe dane osobowe | repo prywatne, bez LICENSE, tylko biblioteki z licencją permisywną, dane fikcyjne; materiały ROPS tylko za zgodą mentora | wszyscy, sprawdza P4 |

### Kolejność cięcia

Jeśli o 20:00 albo o 01:30 nie zdążamy, tniemy od góry. Moduł zostaje, znika tylko jego najdroższa część.

1. Wizualizacja w asystencie kreatora: zamiast generowania na żywo pokazujemy obrazy przygotowane wcześniej albo szkic SVG.
2. Głos (Whisper albo Web Speech API): wycinamy całkiem.
3. Generator wniosków pod nabór: zamiast tekstu od AI wypełniamy szablon polami z fiszki.
4. Tester innowacji: zostaje zapis na test i prosta ocena 1–5 z komentarzem, bez listy poprawek.
5. Komunikacja: zamiast e-maili tylko powiadomienia w aplikacji (Supabase Realtime).
6. Trendy potrzeb w panelu admina: tabela zamiast wykresu i grupowania.
7. Middleman: karta usługi z szablonu zamiast generowanej przez AI.

### Czego nie tniemy nigdy

- Matchmaking z widocznymi słowami kluczowymi i krótkim uzasadnieniem, bo to moduł obowiązkowy i test trafności.
- Wszystkie 7 modułów klikalnych od początku do końca, choćby w prostej wersji.
- Ścieżka komunikacji: nowy pomysł → powiadomienie w panelu ROPS → odpowiedź wraca do autora. To jest test szybkości komunikacji.
- Panel administratora z możliwością edycji i weryfikacji.
- Podstawy WCAG: kontrast, klawiatura, etykiety, powiększenie tekstu.
- Komplet zgłoszenia: PDF do 10 slajdów, film do 3 minut, makiety, link do demo, koszt utrzymania.

Dalej: Materiały ROPS (co jest w materiałach ROPS i jak je wgrać) oraz Wdrożenie i rozwój (jak utrzymać i rozwijać aplikację po hackathonie).
