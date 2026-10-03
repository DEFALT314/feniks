# HubMI.pl – Małopolski Hub Innowacji Społecznych

HackYeah 2026, zadanie ROPS Kraków. Zasady pracy, stos i właściciele folderów: [CLAUDE.md](CLAUDE.md).
Opis danych: [docs/MATERIALY_ROPS.md](docs/MATERIALY_ROPS.md).

## Uruchomienie lokalne

Wymagania: Node.js 22+, pnpm 10 (`corepack enable`).

```bash
git clone git@github.com:DEFALT314/feniks.git && cd feniks
pnpm install
cp .env.example .env.local   # uzupełnij klucze (menedżer haseł, nie czat)
pnpm dev                     # http://localhost:3000
```

Bez kluczy Supabase aplikacja też się uruchomi (strony-zaślepki).

## Polecenia

| Polecenie | Co robi |
|---|---|
| `pnpm dev` | serwer deweloperski |
| `pnpm typecheck` | sprawdzenie typów (to samo co w CI) |
| `pnpm lint` | ESLint (to samo co w CI) |
| `pnpm format` | Prettier |
| `pnpm build` | build produkcyjny |
| `pnpm db:push` | wgranie migracji na bazę w chmurze (robi P4) |
| `pnpm db:types` | typy bazy do `lib/supabase/types.ts` (robi P4) |

Baza: projekt Supabase w chmurze (Frankfurt). Jednorazowo: `pnpm exec supabase login` i
`pnpm exec supabase link --project-ref <ref>`.

## Struktura

- `app/` – strony i endpointy (`app/api/...`), foldery według modułów z CLAUDE.md
- `components/ui/` – wspólne komponenty (P2)
- `lib/supabase/` – klienci Supabase: `server.ts` (sesja użytkownika), `client.ts` (przeglądarka),
  `service.ts` (klucz serwisowy, tylko cron, demo, skrypty)
- `lib/contracts/` – kontrakty endpointów (zod) i fixtures, opis w `lib/contracts/README.md`
- `proxy.ts` – odświeża sesję Supabase (w Next.js 16 zastępuje `middleware.ts`), nie jest zabezpieczeniem
- `supabase/migrations/` – migracje `<YYYYMMDDHHMM>_<modul>_<opis>.sql`
- `data/rops/` – dane ROPS (tylko do odczytu)
