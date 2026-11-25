// Backup export + tested restore (US5, etl-pipeline.md §5, open item O-4).
//
// O-4 DECISION: the backup format is PostgreSQL `pg_dump` custom format
// (-Fc). Rationale: it is a single file, restores with pg_restore, keeps
// the schema + data + constraints together, and compresses well. CSV-per-
// table was rejected: it loses the schema and the FK order has to be
// reconstructed by hand on restore.
//
// The restore is TESTED, not just documented: this script exports, restores
// into a scratch database, and compares the per-table row counts.
// Usage: node src/backup.ts [--db housecraftpros] [--out /tmp/hcp-etl/backup]
// Exit 1 when any table count differs after restore.

import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DB_NAME, psqlJson } from "./pg.ts";

const TABLES = [
  "data_sources",
  "locations",
  "license_holders",
  "ingestion_runs",
  "businesses",
  "licenses",
  "license_status_history",
  "claims",
  "correction_requests",
  "publication_batches",
  "publication_batch_items",
  "audit_logs",
  "dedupe_decisions",
  "source_conflicts",
];

function suPostgres(command: string): string {
  return execFileSync("su", ["postgres", "-c", command], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

async function tableCounts(db: string): Promise<Record<string, number>> {
  const rows = await psqlJson<Array<{ count: number; table: string }>>(
    db,
    `SELECT COALESCE(json_agg(t), '[]'::json) FROM (
       ${TABLES.map(
         (t) => `SELECT '${t}' AS table, count(*)::int AS count FROM ${t}`,
       ).join(" UNION ALL ")}
     ) t;`,
  );
  return Object.fromEntries(rows.map((r) => [r.table, r.count]));
}

async function main(): Promise<void> {
  const db = process.argv.includes("--db")
    ? (process.argv[process.argv.indexOf("--db") + 1] as string)
    : DB_NAME;
  const outDir = process.argv.includes("--out")
    ? (process.argv[process.argv.indexOf("--out") + 1] as string)
    : "/tmp/hcp-etl/backup";
  mkdirSync(outDir, { recursive: true });
  chmodSync(outDir, 0o755);
  const stamp = new Date().toISOString().slice(0, 10);
  const dumpPath = join(outDir, `${db}-${stamp}.dump`);
  const restoreDb = `${db}_restore`;

  console.log(`exporting ${db} to ${dumpPath} (pg_dump -Fc) ...`);
  // pg_dump runs as the postgres user: pre-create the file world-writable.
  writeFileSync(dumpPath, "", "utf8");
  execFileSync("chmod", ["666", dumpPath]);
  suPostgres(`pg_dump -Fc -d ${db} -f ${dumpPath}`);
  execFileSync("chmod", ["644", dumpPath]);

  console.log(`restoring into scratch database ${restoreDb} ...`);
  suPostgres(`psql -d postgres -c "DROP DATABASE IF EXISTS ${restoreDb};" -c "CREATE DATABASE ${restoreDb};"`);
  suPostgres(`pg_restore -d ${restoreDb} ${dumpPath}`);

  const before = await tableCounts(db);
  const after = await tableCounts(restoreDb);
  let failed = 0;
  for (const t of TABLES) {
    const ok = before[t] === after[t];
    console.log(`${ok ? "PASS" : "FAIL"}  ${t}: source=${before[t]} restored=${after[t]}`);
    if (!ok) failed += 1;
  }
  // The scratch database is left in place for inspection; drop it on the
  // next run (DROP DATABASE IF EXISTS above). Report its size for the record.
  const sizes = suPostgres(
    `psql -d postgres -t -A -c "SELECT pg_size_pretty(pg_database_size('${db}'));" -c "SELECT pg_size_pretty(pg_database_size('${restoreDb}'));"`,
  ).trim().split("\n");
  console.log(`source size: ${sizes[0]}  restored size: ${sizes[1]}  dump file: ${dumpPath}`);
  if (failed > 0) {
    console.error(`RESTORE MISMATCH on ${failed} table(s)`);
    process.exit(1);
  }
  console.log(`backup/restore OK: ${TABLES.length}/${TABLES.length} tables match`);
}

main().catch((e) => {
  console.error(`BACKUP FAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
