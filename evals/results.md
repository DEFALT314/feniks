# Matchmaking accuracy

Generated: 2026-10-03 19:55 UTC · mode: vectors + keywords · `npx tsx evals/match-accuracy.ts`

| set | queries | top 1 | top 3 | top 10 | false "no match" |
|---|---|---|---|---|---|
| ROPS (gold): 230 queries from ROPS, keyword-rich | 230 | 93% | **100%** | 100% | 5% |
| colloquial: 40 vague descriptions without catalog words (written by P3) | 40 | 93% | **100%** | 100% | 15% |
| atypical: 41: typos, no diacritics, one word, jargon, Ukrainian, English (P3) | 41 | 88% | **98%** | 98% | 29% |

White spots: 94% of 80 problems outside the Library flagged as "no match" (without AI).

## Challenge from the Challenges Map

One everyday query per challenge (48, `evals/challenge_queries.jsonl`, written by P3). Off-topic = a challenge from a wrong area. Without AI no challenge is shown on purpose: vectors of the short challenge texts put 44% of these queries in a wrong area.

| mode | queries | right area | right challenge | off-topic | none |
|---|---|---|---|---|---|
| without AI | 48 | 0% | **0%** | 0% | 100% |
| with AI | 48 | 96% | **96%** | 4% | 0% |

With the AI choice (deepseek-chat), sample of 20 ROPS queries: top 1 90%, top 3 **95%**, about 2 s per query.

Target from the issue: at least 80% in the top 3 on the ROPS set. The colloquial and atypical sets were
written by P3, so results on them may be slightly optimistic; the ROPS set is independent. Sentences from
`przyklady_zapytan` never go into the vectors or the keyword index (they are the test sentences).
