// License lookup tests (Sprint 02, spec v2 §7 acceptance: active / expired /
// suspended (synthetic row — no suspended license exists in the sources) /
// not found / duplicate name). All against a scratch PostgreSQL database
// (housecraftpros_lookup_test), loaded with the small fixture CSVs through
// the real driver — never the dry-run database. Fixture data is synthetic
// (555 phone numbers, invented license numbers).
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
import { lookupByLicense, lookupByName } from "../src/lookup.ts";

const TEST_DB = "housecraftpros_lookup_test";
const TESTS_DIR = fileURLToPath(new URL(".", import.meta.url));
const ETL_DIR = join(TESTS_DIR, "..");
const REPO_DIR = join(ETL_DIR, "..");
const FIXTURES = join(TESTS_DIR, "fixtures");
const STAGING = mkdtempSync(join(tmpdir(), "hcp-lookuptest-"));
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

function runEtl(file: string, source: string): void {
  const r = spawnSync(
    "node",
    ["src/run.ts", "--source", source, "--file", file, "--staging", STAGING],
    { cwd: ETL_DIR, encoding: "utf8", env: { ...process.env, HCP_DB: TEST_DB } },
  );
  assert.equal(r.status, 0, r.stderr);
}

before(() => {
  su(`psql -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};" -c "CREATE DATABASE ${TEST_DB};"`);
  const migSrc = join(REPO_DIR, "db", "migrations");
  const migTmp = "/tmp/hcp-lookup-test-migrations";
  execFileSync("rm", ["-rf", migTmp]);
  mkdirSync(migTmp, { recursive: true });
  for (const f of readdirSync(migSrc).filter((f) => f.endsWith(".sql"))) {
    copyFileSync(join(migSrc, f), join(migTmp, f));
  }
  execFileSync("chmod", ["-R", "a+rX", migTmp]);
  for (const f of readdirSync(migTmp).filter((f) => f.endsWith(".sql")).sort()) {
    su(`psql -v ON_ERROR_STOP=1 -d ${TEST_DB} -q -f ${join(migTmp, f)}`);
  }
  runEtl(join(FIXTURES, "rmp-v1.csv"), "tsbpe-rmp");
  runEtl(join(FIXTURES, "elec-reuse.csv"), "tdlr-electrical");
  // Synthetic suspended license (no suspended license exists in any source
  // file, so the status mapping is tested with a clearly-labelled test row
  // in the scratch DB only — never in production data).
  psqlTest(
    `INSERT INTO licenses (business_id, holder_id, source_id, ingestion_run_id, contract_version, trade, license_type, license_number, expiration_date, license_status, verification_level, license_status_source, status_as_of)
     SELECT business_id, holder_id, source_id, ingestion_run_id, 'v1', 'plumbing', 'Responsible Master Plumber', '1999', '2027-06-30', 'suspended', 'authority-confirmed', 'gov_lookup', CURRENT_DATE
     FROM licenses WHERE license_number = '1001';`,
  );
  assert.ok(existsSync(join(STAGING, "q.sql")));
});

after(() => {
  su(`psql -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};"`);
});

describe("license lookup (scratch DB, fixture data)", () => {
  it("active license: status + verification are returned separately, never collapsed", () => {
    const r = lookupByLicense("plumbing", "1001", TEST_DB);
    assert.equal(r.found, true);
    assert.equal(r.matches.length, 1);
    assert.equal(r.matches[0].license_status, "active");
    assert.equal(r.matches[0].verification_level, "authority-confirmed");
    assert.equal(r.matches[0].license_status_source, "source_field");
    assert.equal(r.matches[0].business.name, "SMITH PLUMBING LLC");
    assert.match(r.matches[0].display_note, /as reported by TSBPE/);
    assert.doesNotMatch(r.matches[0].display_note, /Verified/);
  });

  it("expired license: returned as expired, not as not-found", () => {
    const r = lookupByLicense("plumbing", "1003", TEST_DB);
    assert.equal(r.found, true);
    assert.equal(r.matches[0].license_status, "expired");
    assert.equal(r.matches[0].verification_level, "authority-confirmed");
    assert.equal(r.matches[0].expiration_date, "2025-05-31");
  });

  it("suspended license (synthetic row): status passes through unchanged", () => {
    const r = lookupByLicense("plumbing", "1999", TEST_DB);
    assert.equal(r.found, true);
    assert.equal(r.matches[0].license_status, "suspended");
    assert.equal(r.matches[0].verification_level, "authority-confirmed");
  });

  it("inferred license: display note says it is not yet confirmed on .gov", () => {
    const r = lookupByLicense("electrical", "90001", TEST_DB);
    assert.equal(r.found, true);
    assert.equal(r.matches[0].license_status, "active");
    assert.equal(r.matches[0].verification_level, "inferred");
    assert.match(r.matches[0].display_note, /not yet confirmed against a live \.gov lookup/);
  });

  it("not found: found:false + .gov guidance, never a fabricated result", () => {
    const r = lookupByLicense("electrical", "99999", TEST_DB);
    assert.equal(r.found, false);
    assert.equal(r.matches.length, 0);
    assert.match(r.guidance ?? "", /\.gov/);
  });

  it("duplicate name: ambiguous, all matching businesses returned", () => {
    const r = lookupByName("SMITH PLUMBING LLC", null, TEST_DB);
    assert.equal(r.found, true);
    assert.equal(r.ambiguous, true);
    // Two businesses share the name: the merged 1001/1002 (+90001 reuse,
    // +1999 synthetic) business and the held 1003 business.
    assert.equal(new Set(r.matches.map((m) => m.business.id)).size, 2);
    assert.equal(r.total_matches, 5); // 1001, 1002, 1003, 1999 + 90001
    assert.match(r.guidance ?? "", /Ask the user which one/);
  });

  it("name + trade filter narrows to one trade", () => {
    const r = lookupByName("SMITH PLUMBING LLC", "electrical", TEST_DB);
    assert.equal(r.found, true);
    assert.equal(r.ambiguous, false);
    assert.equal(r.total_matches, 1);
    assert.equal(r.matches[0].license_number, "90001");
  });
});
