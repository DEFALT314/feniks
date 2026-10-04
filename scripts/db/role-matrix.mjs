// pnpm db:roles – "every role sees only what it should" (#11). Signs in as each demo account and as
// a guest through the public API (anon key + RLS, like the browser), reads every table and checks
// each visible row against the rule for that role. Prints a matrix; exit code 1 on any violation.
// Read-only. Needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY (scripts may use the service key: CLAUDE.md rule 3), e.g. from .env.local.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, serviceKey, opts);

const ACCOUNTS = [
  ["gość", null],
  ["mieszkaniec", "demo.mieszkaniec@example.org"],
  ["jst", "demo.gops@example.org"],
  ["ngo", "demo.fundacja@example.org"],
  ["ekspert", "demo.ekspert@example.org"],
  ["rops_admin", "demo.rops@example.org"],
];

async function signIn(email) {
  const client = createClient(url, anonKey, opts);
  if (!email) return { client, id: null };
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`${email}: ${error.message} (click "Wejdź jako…" once to create it)`);
  const { data: s, error: e2 } = await client.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (e2) throw new Error(`${email}: ${e2.message}`);
  return { client, id: s.user.id };
}

// Facts needed by the rules, read once with the service key.
const all = async (table, columns) => {
  const { data, error } = await admin.from(table).select(columns).limit(10000);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
};
const [ideas, participants] = await Promise.all([
  all("ideas", "id, autor_id, wyslany_at"),
  all("thread_participants", "thread_id, user_id"),
]);
const ideaAuthor = new Map(ideas.map((i) => [i.id, i.autor_id]));
const inThread = (threadId, me) => participants.some((p) => p.thread_id === threadId && p.user_id === me);
const ROPS = new Set(["rops_redaktor", "rops_admin"]);

// For each table: the columns to read and whether a visible row is allowed for (role, me).
// "public" tables must be visible to everyone; "everyRowForRops" tables must be fully visible to ROPS.
const TABLES = {
  innovations: { cols: "id", public: true },
  challenge_areas: { cols: "id", public: true },
  resources: { cols: "id", public: true },
  instytucje: { cols: "id", public: true },
  calls: { cols: "id, opublikowany", allowed: (r, role) => r.opublikowany || ROPS.has(role) },
  profiles: { cols: "id", allowed: (r, role, me) => r.id === me || ROPS.has(role), everyRowForRops: true },
  notifications: { cols: "user_id", allowed: (r, _role, me) => r.user_id === me },
  audit_log: { cols: "id", allowed: (_r, role) => ROPS.has(role), everyRowForRops: true },
  ideas: {
    cols: "id, autor_id, wyslany_at",
    allowed: (r, role, me) => r.autor_id === me || (r.wyslany_at && (ROPS.has(role) || role === "ekspert")),
  },
  idea_reviews: {
    cols: "idea_id, ekspert_id",
    allowed: (r, role, me) => ROPS.has(role) || r.ekspert_id === me || ideaAuthor.get(r.idea_id) === me,
    everyRowForRops: true,
  },
  threads: { cols: "id", allowed: (r, role, me) => ROPS.has(role) || inThread(r.id, me), everyRowForRops: true },
  messages: {
    cols: "thread_id",
    allowed: (r, role, me) => ROPS.has(role) || inThread(r.thread_id, me),
    everyRowForRops: true,
  },
  middleman_cards: {
    cols: "owner_id, status",
    allowed: (r, role, me) => r.owner_id === me || (ROPS.has(role) && r.status === "wyslana_do_rops"),
  },
  match_queries: { cols: "id", allowed: (_r, role) => ROPS.has(role) },
  ai_usage: { cols: "user_id", allowed: (r, role, me) => r.user_id === me || role === "rops_admin" },
  innovation_reviews: {
    cols: "user_id",
    allowed: (r, role, me) => r.user_id === me || ROPS.has(role),
    everyRowForRops: true,
  },
};

const totals = {};
for (const t of Object.keys(TABLES)) {
  const { count } = await admin.from(t).select("*", { count: "exact", head: true });
  totals[t] = count ?? 0;
}

const matrix = {};
const violations = [];
for (const [role, email] of ACCOUNTS) {
  const { client, id } = await signIn(email);
  const roleKey = email ? role : "anon";
  matrix[role] = {};
  for (const [table, rule] of Object.entries(TABLES)) {
    const { data, error } = await client.from(table).select(rule.cols).limit(10000);
    const rows = error ? [] : data;
    matrix[role][table] = rows.length;
    if (rule.public) {
      if (rows.length === 0 && totals[table] > 0) violations.push(`${role}: ${table} should be public, sees 0`);
      continue;
    }
    const bad = rows.filter((r) => !rule.allowed(r, roleKey, id));
    if (bad.length) violations.push(`${role}: ${table} – ${bad.length} row(s) it must not see`);
    if (rule.everyRowForRops && ROPS.has(roleKey) && rows.length !== totals[table]) {
      violations.push(`${role}: ${table} – sees ${rows.length} of ${totals[table]}, ROPS must see all`);
    }
  }
  await client.auth.signOut().catch(() => {});
}

const roles = ACCOUNTS.map(([r]) => r);
const pad = (s, n) => String(s).padStart(n);
console.log(`${"tabela".padEnd(16)}${pad("wszystkie", 10)}${roles.map((r) => pad(r, 12)).join("")}`);
for (const table of Object.keys(TABLES)) {
  console.log(`${table.padEnd(16)}${pad(totals[table], 10)}${roles.map((r) => pad(matrix[r][table], 12)).join("")}`);
}
console.log(violations.length ? `\n✗ ${violations.length} problem(s):\n  ${violations.join("\n  ")}` : "\n✓ Every role sees only what it should.");
process.exit(violations.length ? 1 : 0);
