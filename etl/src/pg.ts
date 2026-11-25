// PostgreSQL access for the ETL.
//
// The engine is zero-dependency, so it has NO Postgres driver. Loading is
// done by generating parameterized SQL / COPY files and applying them with
// the local `psql` binary (child_process). This module is the only place
// that shells out to psql.
//
// Quirk (data-model.md §9): the `postgres` OS user cannot read /home/hatch,
// so every file psql must read (SQL scripts, COPY TSV files) is staged
// under /tmp, which the postgres user CAN read. The repo files remain the
// source of truth; /tmp holds generated staging artifacts only.

import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Default database is the dry-run database. Tests override it with the
// HCP_DB environment variable to run against a scratch database.
export const DB_NAME = process.env["HCP_DB"] ?? "housecraftpros";

function runPsql(db: string, args: string[]): string {
  const inner = `psql -d ${db} ${args.join(" ")}`;
  return execFileSync("su", ["postgres", "-c", inner], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

// Run a SQL file with psql. Throws (with psql's stderr) on any error when
// ON_ERROR_STOP=1 is set. Returns combined stdout.
export function psqlFile(db: string, sqlPath: string): string {
  return runPsql(db, ["-v", "ON_ERROR_STOP=1", "-q", "-f", sqlPath]);
}

// Run a SQL string and return stdout. Implemented by writing the SQL to a
// temp file (so quoting can never break the shell command) and running it
// with psql -t -A (tuples only, unaligned) for machine-readable output.
export function psqlQuery(db: string, sql: string): string {
  const dir = mkdtempSync(join(tmpdir(), "hcp-psql-"));
  const file = join(dir, "query.sql");
  writeFileSync(file, sql, "utf8");
  // mkdtemp creates 0700 dirs owned by root; the postgres user must be
  // able to read the file, so open the permissions up explicitly.
  chmodSync(dir, 0o755);
  chmodSync(file, 0o644);
  return runPsql(db, ["-t", "-A", "-v", "ON_ERROR_STOP=1", "-q", "-f", file]);
}

// Run a SQL string expected to return a single JSON value:
//   SELECT COALESCE(json_agg(t), '[]'::json) FROM (...) t;
// Returns the parsed JSON.
export function psqlJson<T>(db: string, sql: string): T {
  const out = psqlQuery(db, sql).trim();
  return JSON.parse(out) as T;
}

// Run a SQL string expected to return a single scalar value.
export function psqlScalar(db: string, sql: string): string {
  return psqlQuery(db, sql).trim();
}
