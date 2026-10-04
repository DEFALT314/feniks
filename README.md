# HubMI.pl – Małopolski Hub Innowacji Społecznych

HackYeah 2026, ROPS Kraków challenge. Working rules, stack and folder owners: [CLAUDE.md](CLAUDE.md).
Data description: [docs/MATERIALY_ROPS.md](docs/MATERIALY_ROPS.md).

## Running locally

Requirements: Node.js 22+, pnpm 10 (`corepack enable`).

```bash
git clone git@github.com:DEFALT314/feniks.git && cd feniks
pnpm install
cp .env.example .env.local   # fill in the keys (password manager, not chat)
pnpm dev                     # http://localhost:3000
```

The app also starts without Supabase keys (placeholder pages).

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | development server |
| `pnpm typecheck` | type check (same as CI) |
| `pnpm lint` | ESLint (same as CI) |
| `pnpm format` | Prettier |
| `pnpm build` | production build |
| `pnpm db:push` | push migrations to the cloud database (done by P4) |
| `pnpm db:types` | database types into `lib/supabase/types.ts` (done by P4) |

Database: a Supabase cloud project (Frankfurt). One-time setup: `pnpm exec supabase login` and
`pnpm exec supabase link --project-ref <ref>`.

## Structure

- `app/` – pages and endpoints (`app/api/...`), folders by module as in CLAUDE.md
- `components/ui/` – shared components (P2)
- `lib/supabase/` – Supabase clients: `server.ts` (user session), `client.ts` (browser),
  `service.ts` (service key, only cron, demo, scripts)
- `lib/contracts/` – endpoint contracts (zod) and fixtures, described in `lib/contracts/README.md`
- `proxy.ts` – refreshes the Supabase session (replaces `middleware.ts` in Next.js 16), not a security boundary
- `supabase/migrations/` – migrations `<YYYYMMDDHHMM>_<module>_<description>.sql`
- `data/rops/` – ROPS data (read-only)

## Before a demo (P4)

Needs the Supabase CLI linked (`pnpm exec supabase login`, `pnpm exec supabase link --project-ref …`)
and `.env.local` with the Supabase keys.

```bash
pnpm demo:reset          # demo data back to the mockups, rehearsal leftovers removed
pnpm demo:reset --full   # the same, after reloading the catalog (supabase/seed.sql)
pnpm db:test             # SQL permission tests (supabase/tests/*.sql), each rolled back
pnpm db:roles            # signs in as every demo account and a guest: who sees which rows
```

`demo:reset` removes everything the demo accounts created while clicking through the app (ideas,
service cards, test sign-ups and ratings, conversations, notifications, the daily AI counter) and
inserts the mockup data again: 3 ideas in the ROPS queue, a conversation, a service card, 3 tests,
3 grant calls and the search statistics for "Potrzeby w regionie". Real accounts are not touched.
