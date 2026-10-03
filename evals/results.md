# Matchmaking accuracy

Generated: 2026-10-03 17:10 UTC · mode: vectors + keywords · `npx tsx evals/match-accuracy.ts`

| set | queries | top 1 | top 3 | top 10 | false "no match" |
|---|---|---|---|---|---|
| ROPS (gold): 230 queries from ROPS, keyword-rich | 230 | 93% | **100%** | 100% | 5% |
| colloquial: 40 vague descriptions without catalog words (written by P3) | 40 | 93% | **100%** | 100% | 15% |
| atypical: 41: typos, no diacritics, one word, jargon, Ukrainian, English (P3) | 41 | 88% | **98%** | 98% | 29% |

White spots: 94% of 80 problems outside the Library flagged as "no match" (without AI).

With the AI choice (deepseek-v4-flash:free via Token Harbor), sample of the first 20 ROPS queries, measured 2026-10-03 with `--ai 20`: top 1 95%, top 3 **100%**, about 16 s per query (free tier; repeated queries are served from `ai_cache` in ~70 ms).

Target from the issue: at least 80% in the top 3 on the ROPS set. The colloquial and atypical sets were
written by P3, so results on them may be slightly optimistic; the ROPS set is independent. Sentences from
`przyklady_zapytan` never go into the vectors or the keyword index (they are the test sentences).
