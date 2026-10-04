// pnpm db:test – runs every SQL permission test in supabase/tests/ on the linked project.
// Each file runs inside BEGIN … ROLLBACK, so nothing stays in the database. Exit code 1 on failure.
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rowsOf, runSql } from "./run-sql.mjs";

const dir = "supabase/tests";
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const tmp = mkdtempSync(join(tmpdir(), "hubmi-rls-"));
let passed = 0;
let failed = 0;

try {
  for (const file of files) {
    const wrapped = join(tmp, file);
    writeFileSync(wrapped, `begin;\n${readFileSync(join(dir, file), "utf8")}\nrollback;\n`);
    let rows;
    try {
      rows = rowsOf(runSql(wrapped));
    } catch (error) {
      failed += 1;
      console.log(`✗ ${file}: ${String(error.stderr || error.message).split("\n").slice(0, 3).join(" ")}`);
      continue;
    }
    const bad = rows.filter((r) => r.ok !== true);
    passed += rows.length - bad.length;
    failed += bad.length;
    console.log(`${bad.length ? "✗" : "✓"} ${file}: ${rows.length - bad.length}/${rows.length}`);
    for (const r of bad) console.log(`    ✗ ${r.test}`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
