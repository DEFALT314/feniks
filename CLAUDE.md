# HubMI.pl – instructions for Claude Code

## Project
HackYeah 2026, ROPS Kraków challenge: Małopolski Hub Innowacji Społecznych (Małopolska Social Innovation Hub).
Seven modules: I Matchmaking (mandatory), II Knowledge base (Zasobnik wiedzy), III Idea creator (Kreator pomysłów),
IV Innovation tester (Tester innowacji), V Messages (Komunikacja), VI Admin panel, VII Middleman. We build it as if
the app were going to be deployed at ROPS. The user interface is in Polish, in plain language, with no English words.

## Stack
- Next.js (App Router, TypeScript), Tailwind + shadcn/ui, Vercel (region `fra1`).
- Supabase: Postgres + pgvector, Auth, Realtime, Storage.
- Hugging Face: private Space with `sdadas/mmlw-e5-small` (384-dim embeddings, prefixes `query: ` and `passage: `);
  Inference Providers: DeepSeek V4.1 Flash through an OpenAI-compatible router, plus an image model.
- E-mail: Resend.

## Folder owners (don't edit other people's folders; need a change → message the owner)
| Person | Folders |
|---|---|
| P1 Radek – Content and Knowledge base | `app/library/`, `app/challenge-map/`, `app/resources/`, `app/api/innovations/`, `scripts/seed/`, `supabase/seed.sql`, `docs/`, `pitch/` |
| P2 Paweł – Interface and Idea creator | `components/ui/`, `app/layout.tsx`, `app/page.tsx`, `app/login/`, `app/my/creator/`, `app/my/tester/`, `app/api/creator/`, `app/api/tester/`, `styles/`, `design/` |
| P3 Konrad – AI and matching | `app/match/`, `app/my/middleman/`, `app/api/match/`, `app/api/ai/`, `lib/ai/`, `hf-space/`, `scripts/embed.py`, `evals/`, `data/derived/` |
| P4 Dominik – Platform and ROPS | `proxy.ts`, `lib/auth/`, `lib/supabase/`, `app/admin/`, `app/my/messages/`, `app/api/admin/`, `app/api/messages/`, `app/api/notifications/`, `app/api/cron/`, `app/api/demo/`, `lib/notifications.ts`, `lib/audit.ts`, `supabase/migrations/*_shared.sql`, `supabase/seed_demo.sql`, `.github/`, Vercel configuration |

Shared: `lib/contracts/` (everyone edits only their own module's file), `data/rops/` (read-only).

## Rules
0. **Look:** build every screen from its mockup in `design/makiety/` (table in `design/makiety/README.md`),
   using components from `components/ui/`. Don't invent your own colors or layouts.
1. **Auth:** always `getCurrentUser()` from `lib/auth`. `/admin/*` pages check the role on the server
   in the layout. Middleware only refreshes the session and is not a security boundary.
2. **Database:** every new table goes in a new migration `supabase/migrations/<YYYYMMDDHHMM>_<module>_<description>.sql`,
   with `enable row level security` and policies. Don't edit other people's or already merged migrations.
   Roles: `mieszkaniec`, `ngo`, `jst`, `ekspert`, `rops_redaktor`, `rops_admin` (SQL function `public.moja_rola()`).
3. **Data access:** endpoints and Server Components use the client with the user's session
   (`lib/supabase/server.ts`). The service key only in `app/api/cron/`, `app/api/demo/` and scripts.
4. **Contracts:** zod schema in `lib/contracts/<module>.ts`, sample data in `lib/contracts/fixtures/<module>.json`.
   Using someone else's endpoint that doesn't work yet → work on fixtures. After 17:00 contracts
   change only by adding fields.
5. **AI:** only through `lib/ai/llm.ts` (variables `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`). The model picks
   only from the identifiers it was given or returns "none". The JSON response is validated with zod,
   one retry. Every AI text carries the label „Propozycja AI”; nothing is published or sent
   without a human click. No personal data goes to AI.
6. **Secrets:** server-side variables only. `NEXT_PUBLIC_*` holds only the Supabase URL and public key.
7. **Accessibility (WCAG 2.1 AA, designing for 2.2):** semantic HTML, field labels, visible focus,
   4.5:1 contrast, full keyboard support, `aria-live="polite"` for AI responses and notifications,
   touch targets at least 44 px, `lang="pl"`, layout works at 200% zoom.
8. **Data:** fictional people only. ROPS materials from `data/rops/` (description: `docs/MATERIALY_ROPS.md`)
   always with a link to the source; no names of innovation authors.
9. **Licenses:** only MIT, Apache, BSD or ISC libraries. Don't add a LICENSE file. Don't copy other people's
   code, texts or graphics.
10. **Workflow:** small changes, commit messages in English, PR to `main` with a link to the Vercel preview, green CI
    (typecheck, lint, unit tests, axe test). Everyone merges their own PR once CI is green and it merges
    cleanly with `main`.
11. **Unit tests:** every logic change (functions in `lib/`, endpoints in `app/api/`, zod schemas,
    validation, permissions) comes with unit tests in the same PR, to prevent regressions. Fixing a bug →
    first a test that reproduces it, then the fix. Tests live next to the code (`*.test.ts`), with no network and no real
    database (replace AI and Supabase with mocks or fixtures). Don't delete or disable other people's tests to make
    CI pass. A PR with new code and no unit tests is not ready.
12. **English everywhere except the UI:** variable, function, type, component, file and folder names, comments,
    test names, commit messages and this file are in English (e.g. `lib/matching/score.ts`, `MatchCard.tsx`, not `wynik.ts`).
    Page addresses are in English too: route folders in `app/` (e.g. `app/library/`, not `app/biblioteka/`),
    API paths, query parameters (`?category=`, not `?kategoria=`) and anchors (`#main-content`, not `#tresc`).
    Only what the user sees stays in Polish (interface texts, labels, messages, page titles), plus database
    column names and existing contract data fields. Don't rename existing Polish names in passing, only in a
    separate PR.
13. **Sync with `main` before a PR and before saying "done":** others merge all the time. Run `git fetch origin`
    and merge or rebase `origin/main` into your branch, then rerun typecheck, lint, tests and build on the result.
    Check what changed on `main` since you started (`git log HEAD..origin/main`): renamed files, routes,
    contracts or components you use. Fix conflicts and broken references before opening the PR, and again
    before merging it or reporting the task as done.

## Tasks (GitHub Issues)
Each person has a label P1–P4 (P1 Radek, P2 Paweł, P3 Konrad, P4 Dominik); milestones M1–M6 give the order. Session start: `/zadanie P3` (your own label).
1. `gh issue list --label P3 --state open --json number,title,milestone,labels` and pick a task from the earliest
   milestone, without the `w toku` label. On a tie, first the one whose "Blokuje" (Blocks) section lists other people.
2. `gh issue view <nr>`: read the checklist and the **Zależności** (Dependencies) section. For each "Blokowane przez #X" (Blocked by) check
   `gh issue view X --json state`. Open → don't wait: work on `lib/contracts/fixtures/`, and say in the PR what to swap.
   Not even a contract yet → take another unblocked task.
3. `gh issue edit <nr> --add-label "w toku"`, branch `p3/<nr>-short-description`. Show the human a 3–6 point plan
   and start after their "ok".
4. Done: sync with `main` (rule 13), then PR with `Closes #<nr>` and the checklist ticked. Blocked by something outside the list → comment on the issue,
   label `zablokowane`, message the owner.
Don't close or edit other people's issues beyond commenting.

## Data and tests
- `data/rops/*.json` is the source of seed data; `supabase/seed.sql` is generated by the script in `scripts/seed/`.
- The Idea creator canvas is read statically from `data/rops/canvas_innowacji.json`.
- Matchmaking accuracy test: `data/rops/gold_matchmaking.jsonl`, target at least 80% in the top 3.

## Demo mode
`DEMO_MODE=true`: a „Wejdź jako…” screen with demo accounts (`/api/demo/login`) and a
„Tryb demonstracyjny – dane fikcyjne” banner. Disabled in production.
