// Human review workflow tests (Sprint 02, US3). Scratch PostgreSQL database
// (housecraftpros_review_test), loaded with the small fixture CSVs through
// the real driver — never the dry-run database. Fixture data is synthetic.
// A human decision is simulated with by:"tester"; the tool itself never
// decides.
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyKeepSeparate,
  applyMerge,
  listHeldClusters,
  planMerge,
  showCluster,
} from "../src/review.ts";

const TEST_DB = "housecraftpros_review_test";
const TESTS_DIR = fileURLToPath(new URL(".", import.meta.url));
const ETL_DIR = join(TESTS_DIR, "..");
const REPO_DIR = join(ETL_DIR, "..");
const FIXTURES = join(TESTS_DIR, "fixtures");
const STAGING = mkdtempSync(join(tmpdir(), "hcp-reviewtest-"));
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
  const migTmp = "/tmp/hcp-review-test-migrations";
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
  runEtl(join(FIXTURES, "rmp-held-merge.csv"), "tsbpe-rmp");
});

after(() => {
  su(`psql -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};"`);
});

describe("held-cluster review workflow (scratch DB, fixture data)", () => {
  it("list: two held clusters, one per name-only cluster", () => {
    const clusters = listHeldClusters(TEST_DB);
    assert.equal(clusters.length, 2);
    const keys = clusters.map((c) => c.cluster_key).sort();
    assert.deepEqual(keys, ["held merge llc", "smith plumbing llc"]);
    const held = clusters.find((c) => c.cluster_key === "held merge llc");
    assert.equal(held?.license_count, 2);
    assert.equal(held?.business_count, 2);
    assert.deepEqual(held?.license_numbers, ["2001", "2002"]);
  });

  it("show: one cluster's licenses, businesses and latest decision", () => {
    const d = showCluster(TEST_DB, "held merge llc");
    assert.equal(d.licenses.length, 2);
    assert.equal(d.businesses.length, 2);
    assert.equal(d.latest_decision?.decision, "held_ambiguous");
    assert.equal(d.latest_decision?.decided_by, "etl");
    assert.equal(d.businesses[0].dedupe_status, "ambiguous_held");
  });

  it("plan merge is a dry run: it changes nothing", () => {
    const beforeBusinesses = count("businesses");
    const plan = planMerge(TEST_DB, "held merge llc");
    assert.equal(plan.licenses_to_move.length, 1);
    assert.equal(plan.businesses_to_remove.length, 1);
    assert.equal(plan.license_ids.length, 2);
    assert.equal(count("businesses"), beforeBusinesses);
    assert.equal(count("licenses"), 40);
  });

  it("apply merge: one business keeps both licenses, the other is removed with an audit row", () => {
    const result = applyMerge(TEST_DB, "held merge llc", "tester", "same storefront, verified by phone");
    assert.equal(result.action, "merged");
    assert.equal(result.decided_by, "human:tester");
    assert.equal(result.licenses_moved, 1);
    assert.equal(result.businesses_removed.length, 1);
    assert.equal(count("licenses"), 40);
    assert.equal(count("businesses"), 38);
    const d = showCluster(TEST_DB, "held merge llc");
    assert.equal(d.businesses.length, 1);
    assert.equal(d.businesses[0].license_count, 2);
    assert.equal(d.businesses[0].dedupe_status, "merged");
    assert.equal(d.latest_decision?.decision, "merged");
    assert.equal(d.latest_decision?.decided_by, "human:tester");
    assert.match(d.latest_decision?.rationale ?? "", /same storefront/);
    assert.equal(
      count("audit_logs", `action = 'review.merge' AND actor = 'human:tester'`),
      1,
    );
    assert.equal(count("businesses", `NOT EXISTS (SELECT 1 FROM licenses l WHERE l.business_id = businesses.id)`), 0);
    // The merged cluster leaves the queue.
    assert.equal(listHeldClusters(TEST_DB).length, 1);
  });

  it("keep-separate: one decision row, no data moves, cluster leaves the queue", () => {
    const beforeBusinesses = count("businesses");
    const result = applyKeepSeparate(TEST_DB, "smith plumbing llc", "tester", "different owners, same name");
    assert.equal(result.action, "kept_separate");
    assert.equal(result.decided_by, "human:tester");
    assert.equal(count("businesses"), beforeBusinesses);
    assert.equal(count("licenses"), 40);
    assert.equal(
      count(
        "dedupe_decisions",
        `decision = 'rejected_no_merge' AND cluster_key = 'smith plumbing llc' AND decided_by = 'human:tester'`,
      ),
      1,
    );
    assert.equal(listHeldClusters(TEST_DB).length, 0);
  });

  it("deciding an already-decided cluster throws and changes nothing", () => {
    assert.throws(() => applyMerge(TEST_DB, "held merge llc", "tester"), /not awaiting review/);
    assert.throws(
      () => applyKeepSeparate(TEST_DB, "smith plumbing llc", "tester"),
      /not awaiting review/,
    );
    assert.equal(count("businesses"), 38);
  });

  it("deciding requires a human identifier", () => {
    assert.throws(() => applyMerge(TEST_DB, "held merge llc", "  "), /--by/);
  });
});
