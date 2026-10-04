// Runs a SQL file on the linked Supabase project (`supabase link`) through the Supabase CLI and
// returns the parsed JSON result. Shared by the db:test and demo:reset scripts (P4, #11).
import { execFileSync } from "node:child_process";

export function runSql(file) {
  const out = execFileSync("pnpm", ["exec", "supabase", "db", "query", "--linked", "-f", file], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  const start = out.indexOf("{");
  if (start === -1) throw new Error(`Unexpected output from supabase db query:\n${out.slice(0, 500)}`);
  return JSON.parse(out.slice(start));
}

export function rowsOf(result) {
  if (Array.isArray(result)) return result;
  return result.rows ?? result.result ?? [];
}
