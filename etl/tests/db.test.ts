// Database-level tests (T022): idempotency, rollback, backup export/restore,
// dedupe rules, status/verification split, disappeared-record handling and
// expired handling — all against a scratch PostgreSQL database
// (housecraftpros_test), never the dry-run database. The scratch DB is
// created from the real migrations, loaded with small fixture CSVs through
// the real driver (node src/run.ts --file), and dropped afterwards.
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DB = "housecraftpros_test";
const TESTS_DIR = fileURLToPath(new URL(".", import.meta.url));
const ETL_DIR = join(TESTS_DIR, "..");
const REPO_DIR = join(ETL_DIR, "..");
const FIXTURES = join(TESTS_DIR, "fixtures");
const STAGING = mkdtempSync(join(tmpdir(), "hcp-dbtest-"));
chmodSync(STAGING, 0o755);

function su(command: string): string {
  return execFileSync("su", ["postgres", "-c", command], { encoding: "utf8" });
}

function psqlTest(sql: string): string {
  const file = join(STAGING, "q.sql");
  writeFileSync(file, sql, "utf8");
  chmodSync(file, 0o644);
  return su(`psql -d ${TEST_DB} -t -A -v ON_ERROR_STOP=1 -q -f ${file}`).trim();
}

function count(table: string, where = ""): number {
  return Number(psqlTest(`SELECT count(*) FROM ${table}${where ? ` WHERE ${where}` : ""};`));
}

function runEtl(file: string): { status: number | null; stderr: string; stdout: string } {
  const r = spawnSync(
    "node",
    ["src/run.ts", "--source", "tsbpe-rmp", "--file", file, "--staging", STAGING],
    { cwd: ETL_DIR, encoding: "utf8", env: { ...process.env, HCP_DB: TEST_DB } },
  );
  return { status: r.status, stderr: r.stderr ?? "", stdout: r.stdout ?? "" };
}

before(() => {
  su(`psql -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};" -c "CREATE DATABASE ${TEST_DB};"`);
  const migSrc = join(REPO_DIR, "db", "migrations");
  const migTmp = "/tmp/hcp-test-migrations";
  execFileSync("rm", ["-rf", migTmp]);
  mkdirSync(migTmp, { recursive: true });
  for (const f of readdirSync(migSrc).filter((f) => f.endsWith(".sql"))) {
    copyFileSync(join(migSrc, f), join(migTmp, f));
  }
  execFileSync("chmod", ["-R", "a+rX", migTmp]);
  for (const f of readdirSync(migTmp).filter((f) => f.endsWith(".sql")).sort()) {
    su(`psql -v ON_ERROR_STOP=1 -d ${TEST_DB} -q -f ${join(migTmp, f)}`);
  }
  assert.equal(count("data_sources"), 3);
  assert.equal(count("licenses"), 0);
});

after(() => {
  su(
    `psql -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB}_restore;" -c "DROP DATABASE IF EXISTS ${TEST_DB};"`,
  );
});

describe("database load (scratch DB, fixture CSVs)", () => {
  it("loads fixture v1: 21 licenses, 20 businesses, merged + held decisions", () => {
    const r = runEtl(join(FIXTURES, "rmp-v1.csv"));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(count("licenses"), 21);
    assert.equal(count("businesses"), 20);
    assert.equal(count("license_status_history"), 21);
    // 1001 + 1002 share company + phone + address -> one merged business.
    assert.equal(
      Number(
        psqlTest(
          `SELECT count(DISTINCT business_id) FROM licenses WHERE license_number IN ('1001','1002');`,
        ),
      ),
      1,
    );
    // 1003 shares only the name -> its own business, held for review.
    assert.equal(count("dedupe_decisions", `decision = 'merged'`), 1);
    assert.equal(count("dedupe_decisions", `decision = 'held_ambiguous'`), 1);
    assert.equal(
      Number(
        psqlTest(
          `SELECT count(*) FROM businesses b WHERE b.id = (SELECT business_id FROM licenses WHERE license_number = '1003') AND b.dedupe_status = 'ambiguous_held';`,
        ),
      ),
      1,
    );
  });

  it("expired handling: the Expired fixture row loads as expired + authority-confirmed and stays queryable", () => {
    assert.equal(
      psqlTest(
        `SELECT license_status || '/' || verification_level FROM licenses WHERE license_number = '1003';`,
      ),
      "expired/authority-confirmed",
    );
    assert.equal(
      psqlTest(`SELECT count(*) FROM licenses WHERE license_number = '1003' AND disappeared_from_source = false;`),
      "1",
    );
  });

  it("round-trip: the DB row matches the normalized record field-for-field", () => {
    const row = psqlTest(
      `SELECT license_type || '|' || COALESCE(license_subtype, '') || '|' || expiration_date::text || '|' || issue_date::text || '|' || license_status || '|' || verification_level || '|' || license_status_source || '|' || endorsements::text || '|' || insurance_company || '|' || contract_version FROM licenses WHERE license_number = '1001';`,
    );
    assert.equal(
      row,
      "Responsible Master Plumber||2027-06-30|2020-01-15|active|authority-confirmed|source_field|[\"MEDGAS\"]|ACME INSURANCE|v1",
    );
  });

  it("re-running the same file is a no-op: no duplicates, no new history", () => {
    const r = runEtl(join(FIXTURES, "rmp-v1.csv"));
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /duplicate_noop/);
    assert.equal(count("licenses"), 21);
    assert.equal(count("businesses"), 20);
    assert.equal(count("license_status_history"), 21);
    assert.equal(count("ingestion_runs"), 1);
  });

  it("second file version: disappeared + status change + unchanged record", () => {
    const r = runEtl(join(FIXTURES, "rmp-v2.csv"));
    assert.equal(r.status, 0, r.stderr);
    assert.equal(count("licenses"), 21);
    assert.equal(count("ingestion_runs"), 2);
    // 1002 vanished from the file -> marked disappeared, never deleted.
    assert.equal(
      psqlTest(`SELECT disappeared_from_source FROM licenses WHERE license_number = '1002';`),
      "t",
    );
    assert.equal(
      count("license_status_history", `change_reason = 'disappeared_from_source'`),
      1,
    );
    // 1001 changed Current -> Expired via the source status field.
    assert.equal(
      psqlTest(`SELECT license_status FROM licenses WHERE license_number = '1001';`),
      "expired",
    );
    assert.equal(
      count(
        "license_status_history",
        `change_reason = 'source_status_change' AND license_id = (SELECT id FROM licenses WHERE license_number = '1001')`,
      ),
      1,
    );
    // 1003 unchanged -> no new history row for it (still exactly 1).
    assert.equal(
      count(
        "license_status_history",
        `license_id = (SELECT id FROM licenses WHERE license_number = '1003')`,
      ),
      1,
    );
    assert.equal(count("license_status_history"), 23);
  });

  it("rollback: a failed transaction changes nothing (L7)", () => {
    const before_licenses = count("licenses");
    const before_history = count("license_status_history");
    const badSql = join(STAGING, "bad.sql");
    writeFileSync(
      badSql,
      `BEGIN;
       UPDATE licenses SET license_status = 'active' WHERE license_number = '1001';
       SELECT 1/0;
       COMMIT;`,
      "utf8",
    );
    chmodSync(badSql, 0o644);
    assert.throws(() =>
      su(`psql -d ${TEST_DB} -v ON_ERROR_STOP=1 -q -f ${badSql}`),
    );
    assert.equal(count("licenses"), before_licenses);
    assert.equal(count("license_status_history"), before_history);
    assert.equal(
      psqlTest(`SELECT license_status FROM licenses WHERE license_number = '1001';`),
      "expired",
    );
  });

  it("backup export/restore on the scratch DB matches every table", () => {
    const outDir = join(STAGING, "backup");
    const r = spawnSync(
      "node",
      ["src/backup.ts", "--db", TEST_DB, "--out", outDir],
      { cwd: ETL_DIR, encoding: "utf8", env: { ...process.env, HCP_DB: TEST_DB } },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /backup\/restore OK: 14\/14 tables match/);
    assert.ok(existsSync(join(outDir, `${TEST_DB}-2026-11-25.dump`)));
  });
});
