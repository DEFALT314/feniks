# HubMI.pl – instrukcje dla Claude Code

## Projekt
HackYeah 2026, zadanie ROPS Kraków: Małopolski Hub Innowacji Społecznych. Siedem modułów:
I Matchmaking (obowiązkowy), II Zasobnik wiedzy, III Kreator pomysłów, IV Tester innowacji,
V Komunikacja, VI Panel administratora, VII Middleman. Budujemy tak, jakby aplikacja miała
zostać wdrożona w ROPS. Interfejs po polsku, prostym językiem, bez angielskich słów.

## Stos
- Next.js (App Router, TypeScript), Tailwind + shadcn/ui, Vercel (region `fra1`).
- Supabase: Postgres + pgvector, Auth, Realtime, Storage.
- Hugging Face: prywatny Space z `sdadas/mmlw-e5-small` (embeddingi 384, prefiksy `query: ` i `passage: `);
  Inference Providers: DeepSeek V4.1 Flash przez router zgodny z OpenAI oraz model do obrazów.
- E-mail: Resend.

## Właściciele folderów (nie edytuj cudzych; potrzebna zmiana → napisz do właściciela)
| Osoba | Foldery |
|---|---|
| P1 Treść i Zasobnik | `app/biblioteka/`, `app/mapa-wyzwan/`, `app/zasoby/`, `app/api/zasoby/`, `scripts/seed/`, `supabase/seed.sql`, `docs/`, `pitch/` |
| P2 Interfejs i Kreator | `components/ui/`, `app/layout.tsx`, `app/page.tsx`, `app/logowanie/`, `app/moje/kreator/`, `app/moje/tester/`, `app/api/kreator/`, `app/api/tester/`, `styles/` |
| P3 AI i dopasowanie | `app/dopasuj/`, `app/moje/middleman/`, `app/api/match/`, `app/api/ai/`, `lib/ai/`, `hf-space/`, `scripts/embed.py`, `evals/`, `data/derived/` |
| P4 Platforma i ROPS | `middleware.ts`, `lib/auth/`, `lib/supabase/`, `app/admin/`, `app/moje/wiadomosci/`, `app/api/admin/`, `app/api/wiadomosci/`, `app/api/powiadomienia/`, `app/api/cron/`, `app/api/demo/`, `lib/powiadomienia.ts`, `lib/audit.ts`, `supabase/migrations/*_wspolne.sql`, `supabase/seed_demo.sql`, `.github/`, konfiguracja Vercel |

Wspólne: `lib/contracts/` (każdy edytuje tylko plik swojego modułu), `data/rops/` (tylko do odczytu).

## Zasady
1. **Logowanie:** zawsze `getCurrentUser()` z `lib/auth`. Strony `/admin/*` sprawdzają rolę na serwerze
   w layoucie. Middleware tylko odświeża sesję i nie jest zabezpieczeniem.
2. **Baza:** każda nowa tabela w nowej migracji `supabase/migrations/<YYYYMMDDHHMM>_<modul>_<opis>.sql`,
   z `enable row level security` i politykami. Nie edytuj cudzych ani już scalonych migracji.
   Role: `mieszkaniec`, `ngo`, `jst`, `ekspert`, `rops_redaktor`, `rops_admin` (funkcja SQL `public.moja_rola()`).
3. **Dostęp do danych:** endpointy i Server Components używają klienta z sesją użytkownika
   (`lib/supabase/server.ts`). Klucz serwisowy tylko w `app/api/cron/`, `app/api/demo/` i skryptach.
4. **Kontrakty:** schemat zod w `lib/contracts/<modul>.ts`, przykładowe dane w `lib/contracts/fixtures/<modul>.json`.
   Korzystasz z cudzego endpointu, który jeszcze nie działa → pracuj na fixtures. Po 17:00 kontrakty
   zmieniamy tylko przez dodanie pól.
5. **AI:** tylko przez `lib/ai/llm.ts` (zmienne `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`). Model wybiera
   wyłącznie spośród przekazanych identyfikatorów albo zwraca „brak”. Odpowiedź JSON sprawdzana zod,
   jedno ponowienie. Każdy tekst z AI ma etykietę „Propozycja AI”; nic nie jest publikowane ani wysyłane
   bez kliknięcia człowieka. Do AI nie trafiają dane osobowe.
6. **Sekrety:** tylko w zmiennych serwera. W `NEXT_PUBLIC_*` wyłącznie adres i publiczny klucz Supabase.
7. **Dostępność (WCAG 2.1 AA, projektujemy pod 2.2):** semantyczny HTML, etykiety pól, widoczny fokus,
   kontrast 4,5:1, pełna obsługa klawiaturą, `aria-live="polite"` dla odpowiedzi AI i powiadomień,
   cele dotykowe co najmniej 44 px, `lang="pl"`, układ działa przy powiększeniu 200%.
8. **Dane:** tylko fikcyjne osoby. Materiały ROPS z `data/rops/` (opis: `docs/MATERIALY_ROPS.md`)
   zawsze z linkiem do źródła; bez nazwisk autorów innowacji.
9. **Licencje:** tylko biblioteki MIT, Apache, BSD lub ISC. Nie dodawaj pliku LICENSE. Nie kopiuj cudzego
   kodu, tekstów ani grafik.
10. **Praca:** małe zmiany, commity po polsku, PR do `main` z linkiem do podglądu Vercel, zielone CI
    (typecheck, lint, test axe). Scalanie robi P4 co godzinę w oknie :00–:10.

## Dane i testy
- `data/rops/*.json` to źródło danych startowych; `supabase/seed.sql` generuje skrypt z `scripts/seed/`.
- Kanwa Kreatora czytana statycznie z `data/rops/canvas_innowacji.json`.
- Test trafności Matchmakingu: `data/rops/gold_matchmaking.jsonl`, cel co najmniej 80% w top 3.

## Tryb demonstracyjny
`DEMO_MODE=true`: ekran „Wejdź jako…” z kontami demo (`/api/demo/login`) i pasek
„Tryb demonstracyjny – dane fikcyjne”. W produkcji wyłączony.
