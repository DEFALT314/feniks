# Module contracts

Each module describes its endpoints here: a zod schema in `lib/contracts/<module>.ts` and sample data
in `lib/contracts/fixtures/<module>.json`. Edit only your own module's file.

| File | Owner |
|---|---|
| `knowledge-base.ts` | P1 |
| `idea-creator.ts`, `innovation-tester.ts` | P2 |
| `match.ts`, `ai.ts`, `middleman.ts` | P3 |
| `admin.ts`, `messages.ts`, `notifications.ts` | P4 |

## Rules
- Export the input and output schemas and their types (`z.infer`).
- Fixtures must pass schema validation (example in `_example.ts`).
- The owner's endpoint doesn't work yet? Work on fixtures.
- After 17:00, contracts change only by **adding** (optional) fields.

## Template
See `_example.ts` and `fixtures/_example.json`.
