// pnpm demo:reset [--full] – puts the demo back into the state from the mockups (#11).
// Runs supabase/seed_demo.sql on the linked project. --full first reloads the catalog
// (supabase/seed.sql: innovations, challenge map, resources); tests of Library innovations are
// removed by that (cascade), which is why seed_demo.sql always runs after it.
import { rowsOf, runSql } from "./run-sql.mjs";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const full = process.argv.includes("--full");
const steps = [...(full ? ["supabase/seed.sql"] : []), "supabase/seed_demo.sql"];

for (const file of steps) {
  process.stdout.write(`→ ${file} … `);
  runSql(file);
  console.log("ok");
}

const tmp = mkdtempSync(join(tmpdir(), "hubmi-demo-"));
const check = join(tmp, "check.sql");
writeFileSync(
  check,
  `select
    (select count(*) from public.innovations) as innowacje,
    (select count(*) from public.ideas where wyslany_at is not null) as pomysly_w_rops,
    (select count(*) from public.threads) as rozmowy,
    (select count(*) from public.tests) as testy,
    (select count(*) from public.calls where opublikowany) as nabory,
    (select count(*) from public.notifications n join auth.users u on u.id = n.user_id
       where u.email like 'demo.%@example.org') as powiadomienia_demo;`,
);
try {
  const [row] = rowsOf(runSql(check));
  console.log("\nStan po resecie:");
  for (const [k, v] of Object.entries(row ?? {})) console.log(`  ${k.padEnd(20)} ${v}`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
