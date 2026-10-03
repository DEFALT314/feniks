// Matchmaking accuracy test (#17): runs the same pipeline as POST /api/match on labelled queries and
// reports whether the expected innovation is in the top 1 / 3 / 10. Target: at least 80% in the top 3
// on data/rops/gold_matchmaking.jsonl. Writes evals/results.md (for the pitch slide).
//
//   NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… EMBED_URL=… EMBED_TOKEN=… \
//     NODE_OPTIONS=--conditions=react-server npx tsx evals/match-accuracy.ts [--ai 25]
//
// --ai N also runs the LLM step on the first N ROPS queries and on all challenge queries (LLM_*
// variables). Without the database/embedding service it measures keywords only.
//
// Challenges: evals/challenge_queries.jsonl has one everyday query per challenge of the Challenges
// Map (48, written by P3) with the acceptable challenge ids; it reports the right area, the right
// challenge and "off-topic" (a challenge from a wrong area, worse than none).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { innovationsFromFiles } from "@/app/library/_lib/from-files";
import { challengeAreasFromFiles } from "@/app/challenge-map/_lib/from-files";
import { embedQuery } from "@/lib/ai/embed";
import { runMatch, type MatchDeps, type VectorHit } from "@/lib/ai/matching/pipeline";
import { rerank } from "@/lib/ai/matching/rerank";

const ROOT = join(__dirname, "..");
type Case = { query: string; expected: string[]; style?: string };

function load(file: string, query: string, expected: string): Case[] {
  return readFileSync(join(ROOT, file), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
    .map((r) => ({ query: r[query], expected: [r[expected]].flat(), style: r.style }));
}

const SETS: { name: string; note: string; cases: Case[] }[] = [
  {
    name: "ROPS (gold)",
    note: "230 queries from ROPS, keyword-rich",
    cases: load("data/rops/gold_matchmaking.jsonl", "zapytanie", "oczekiwane_id"),
  },
  {
    name: "colloquial",
    note: "40 vague descriptions without catalog words (written by P3)",
    cases: load("evals/hard_queries.jsonl", "query", "expected"),
  },
  {
    name: "atypical",
    note: "41: typos, no diacritics, one word, jargon, Ukrainian, English (P3)",
    cases: load("evals/atypical_queries.jsonl", "query", "expected"),
  },
];
type ChallengeCase = { query: string; area: string; challenges: string[] };
const CHALLENGE_CASES: ChallengeCase[] = readFileSync(
  join(ROOT, "evals/challenge_queries.jsonl"),
  "utf8",
)
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));

const NO_ANSWER = load("evals/no_answer_queries.jsonl", "query", "query").map((c) => c.query);

const aiSample = Number(process.argv[process.argv.indexOf("--ai") + 1]) || 0;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db = supabaseUrl && anonKey ? createClient(supabaseUrl, anonKey) : null;

const baseDeps: MatchDeps = {
  innovations: innovationsFromFiles(),
  areas: challengeAreasFromFiles(),
  embedQuery: (text) => (db ? embedQuery(text) : Promise.resolve(null)),
  vectorSearch: async (vector, kind, count) => {
    const { data, error } = await db!.rpc("match_embeddings", {
      query: `[${vector.join(",")}]`,
      match_kind: kind,
      match_count: count,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as VectorHit[];
  },
};

type Score = { top1: number; top3: number; top10: number; weak: number; n: number };
const pct = (k: number, n: number) => `${Math.round((100 * k) / n)}%`;

async function score(cases: Case[], deps: MatchDeps): Promise<Score> {
  const s = { top1: 0, top3: 0, top10: 0, weak: 0, n: cases.length };
  for (const c of cases) {
    const { response } = await runMatch({ description: c.query }, deps);
    const ids = [
      ...response.innovations.map((m) => m.innovation.id),
      ...response.more.map((m) => m.id),
    ];
    const rank = ids.findIndex((id) => c.expected.includes(id));
    if (response.match_quality === "weak") s.weak++; // false alarm: these all have an answer
    if (rank === 0) s.top1++;
    if (rank >= 0 && rank < 3) s.top3++;
    if (rank >= 0 && rank < 10) s.top10++;
  }
  return s;
}

type ChallengeScore = {
  area: number;
  challenge: number;
  offTopic: number;
  none: number;
  n: number;
};

async function scoreChallenges(deps: MatchDeps): Promise<ChallengeScore> {
  const s = { area: 0, challenge: 0, offTopic: 0, none: 0, n: CHALLENGE_CASES.length };
  const areaOf = new Map(deps.areas.flatMap((a) => a.wyzwania.map((w) => [w.id, a.id])));
  for (const c of CHALLENGE_CASES) {
    const { response } = await runMatch({ description: c.query }, deps);
    const got = response.challenge;
    if (!got) {
      s.none++;
      continue;
    }
    const okAreas = new Set([c.area, ...c.challenges.map((id) => areaOf.get(id))]);
    if (okAreas.has(got.area_id)) s.area++;
    else s.offTopic++;
    if (got.challenge_id && c.challenges.includes(got.challenge_id)) s.challenge++;
  }
  return s;
}

function challengeLine(label: string, s: ChallengeScore) {
  console.log(
    `challenges ${label}: area ${pct(s.area, s.n)}  challenge ${pct(s.challenge, s.n)}  off-topic ${pct(s.offTopic, s.n)}  none ${pct(s.none, s.n)}`,
  );
  return `| ${label} | ${s.n} | ${pct(s.area, s.n)} | **${pct(s.challenge, s.n)}** | ${pct(s.offTopic, s.n)} | ${pct(s.none, s.n)} |`;
}

async function main() {
  const mode = db ? "vectors + keywords" : "keywords only (no database)";
  const lines = [
    "# Matchmaking accuracy",
    "",
    `Generated: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · mode: ${mode} · \`npx tsx evals/match-accuracy.ts\``,
    "",
    '| set | queries | top 1 | top 3 | top 10 | false "no match" |',
    "|---|---|---|---|---|---|",
  ];
  for (const set of SETS) {
    const s = await score(set.cases, { ...baseDeps });
    console.log(
      `${set.name.padEnd(12)} top1 ${pct(s.top1, s.n)}  top3 ${pct(s.top3, s.n)}  top10 ${pct(s.top10, s.n)}  weak ${pct(s.weak, s.n)}`,
    );
    lines.push(
      `| ${set.name}: ${set.note} | ${s.n} | ${pct(s.top1, s.n)} | **${pct(s.top3, s.n)}** | ${pct(s.top10, s.n)} | ${pct(s.weak, s.n)} |`,
    );
  }

  // White spots: problems the Library has no answer for should come out as "weak".
  let flagged = 0;
  for (const query of NO_ANSWER) {
    const { response } = await runMatch({ description: query }, { ...baseDeps });
    if (response.match_quality === "weak") flagged++;
  }
  console.log(
    `white spots: ${pct(flagged, NO_ANSWER.length)} of ${NO_ANSWER.length} unanswerable problems flagged`,
  );
  lines.push(
    "",
    `White spots: ${pct(flagged, NO_ANSWER.length)} of ${NO_ANSWER.length} problems outside the Library flagged as \"no match\" (without AI).`,
  );

  const withAi: MatchDeps = {
    ...baseDeps,
    rerank: (d, c, ch) => rerank(d, c, {}, ch),
  };
  lines.push(
    "",
    "## Challenge from the Challenges Map",
    "",
    "One everyday query per challenge (48, `evals/challenge_queries.jsonl`, written by P3). Off-topic = a challenge from a wrong area. Without AI no challenge is shown on purpose: vectors of the short challenge texts put 44% of these queries in a wrong area.",
    "",
    "| mode | queries | right area | right challenge | off-topic | none |",
    "|---|---|---|---|---|---|",
    challengeLine("without AI", await scoreChallenges({ ...baseDeps })),
  );
  if (aiSample) lines.push(challengeLine("with AI", await scoreChallenges(withAi)));

  if (aiSample) {
    const sample = SETS[0].cases.slice(0, aiSample);
    const started = Date.now();
    const s = await score(sample, withAi);
    const seconds = Math.round((Date.now() - started) / 1000 / sample.length);
    console.log(
      `with AI (${sample.length} ROPS) top1 ${pct(s.top1, s.n)}  top3 ${pct(s.top3, s.n)}  ~${seconds} s/query`,
    );
    lines.push(
      "",
      `With the AI choice (${process.env.LLM_MODEL}), sample of ${sample.length} ROPS queries: top 1 ${pct(s.top1, s.n)}, top 3 **${pct(s.top3, s.n)}**, about ${seconds} s per query.`,
    );
  }

  lines.push(
    "",
    "Target from the issue: at least 80% in the top 3 on the ROPS set. The colloquial and atypical sets were",
    "written by P3, so results on them may be slightly optimistic; the ROPS set is independent. Sentences from",
    "`przyklady_zapytan` never go into the vectors or the keyword index (they are the test sentences).",
  );
  writeFileSync(join(ROOT, "evals", "results.md"), lines.join("\n") + "\n");
  console.log("wrote evals/results.md");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
