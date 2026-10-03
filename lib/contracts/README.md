# Kontrakty modułów

Każdy moduł opisuje tu swoje endpointy: schemat zod w `lib/contracts/<modul>.ts` i przykładowe dane
w `lib/contracts/fixtures/<modul>.json`. Edytujesz tylko plik swojego modułu.

| Plik | Właściciel |
|---|---|
| `zasobnik.ts` | P1 |
| `kreator.ts`, `tester.ts` | P2 |
| `match.ts`, `ai.ts`, `middleman.ts` | P3 |
| `admin.ts`, `komunikacja.ts`, `powiadomienia.ts` | P4 |

## Zasady
- Eksportuj schemat wejścia i wyjścia oraz typy (`z.infer`).
- Fixtures muszą przechodzić walidację schematu (przykład w `_przyklad.ts`).
- Endpoint właściciela jeszcze nie działa? Pracuj na fixtures.
- Po 17:00 kontrakty zmieniamy tylko przez **dodanie** pól (opcjonalnych).

## Wzór
Zobacz `_przyklad.ts` i `fixtures/_przyklad.json`.
