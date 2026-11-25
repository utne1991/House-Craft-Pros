// Post-load verification (Stage 6, V2–V3) — re-reads the database and
// checks the invariants the dry-run report cites. Read-only; exits 1 on
// any FAIL so QA/CI can gate on it.
// Usage: node src/verify.ts [--db housecraftpros]

import { DB_NAME, psqlJson, psqlScalar } from "./pg.ts";

interface Check {
  detail: string;
  name: string;
  pass: boolean;
}

async function main(): Promise<void> {
  const db = process.argv.includes("--db")
    ? (process.argv[process.argv.indexOf("--db") + 1] as string)
    : DB_NAME;
  const checks: Check[] = [];
  const one = async <T>(sql: string): Promise<T> => {
    const rows = await psqlJson<T[]>(db, `SELECT COALESCE(json_agg(t), '[]'::json) FROM (${sql}) t;`);
    return rows[0];
  };

  // V2: reconciliation — every run's loaded count matches its parsed count
  // and the DB holds exactly the parsed rows for that source.
  const runs = await psqlJson<
    Array<{
      code: string;
      db_licenses: number;
      row_count_loaded: number;
      row_count_parsed: number;
      status: string;
    }>
  >(
    db,
    `SELECT COALESCE(json_agg(t), '[]'::json) FROM (
       SELECT s.code, r.status, r.row_count_parsed, r.row_count_loaded,
         (SELECT count(*) FROM licenses l WHERE l.source_id = s.id) AS db_licenses
       FROM ingestion_runs r JOIN data_sources s ON s.id = r.source_id
       WHERE r.status = 'succeeded'
     ) t;`,
  );
  for (const r of runs) {
    // db_licenses may EXCEED loaded when a later run marked rows
    // disappeared (they stay in the table by design, L5) — so the check
    // is parsed == loaded and db >= loaded, not db == loaded.
    checks.push({
      detail: `${r.code}: parsed=${r.row_count_parsed} loaded=${r.row_count_loaded} db=${r.db_licenses}`,
      name: `reconciliation ${r.code}`,
      pass: r.row_count_parsed === r.row_count_loaded && r.db_licenses >= r.row_count_loaded,
    });
  }

  // I1 in the database: no expiration_date-derived row is authority-confirmed.
  const i1 = await one<{ n: number }>(
    `SELECT count(*)::int AS n FROM licenses WHERE license_status_source = 'expiration_date' AND verification_level = 'authority-confirmed'`,
  );
  checks.push({ detail: `${i1.n} violating rows`, name: "invariant I1 (no inferred row is authority-confirmed)", pass: i1.n === 0 });

  // Identity uniqueness: no duplicate (source, type, number).
  const dups = await one<{ n: number }>(
    `SELECT count(*)::int AS n FROM (SELECT source_id, license_type, license_number, count(*) c FROM licenses GROUP BY 1,2,3 HAVING count(*) > 1) x`,
  );
  checks.push({ detail: `${dups.n} duplicate identities`, name: "no duplicate license identity", pass: dups.n === 0 });

  // Every license has a business; every business row referenced exists.
  const orphans = await one<{ n: number }>(
    `SELECT count(*)::int AS n FROM licenses l WHERE NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = l.business_id)`,
  );
  checks.push({ detail: `${orphans.n} orphan licenses`, name: "every license has a business", pass: orphans.n === 0 });

  // History: every license has an initial_load row; no license has zero rows.
  const noHistory = await one<{ n: number }>(
    `SELECT count(*)::int AS n FROM licenses l WHERE NOT EXISTS (SELECT 1 FROM license_status_history h WHERE h.license_id = l.id AND h.change_reason = 'initial_load')`,
  );
  checks.push({ detail: `${noHistory.n} licenses without an initial_load history row`, name: "initial_load history present for every license", pass: noHistory.n === 0 });

  // Contract version recorded on runs and licenses.
  const badVersion = await one<{ n: number }>(
    `SELECT count(*)::int AS n FROM licenses WHERE contract_version <> 'v1'`,
  );
  checks.push({ detail: `${badVersion.n} licenses with a contract_version other than v1`, name: "contract_version v1 on all licenses", pass: badVersion.n === 0 });

  // No run left 'running' (stale runs are failed by the driver).
  const running = await one<{ n: number }>(
    `SELECT count(*)::int AS n FROM ingestion_runs WHERE status = 'running'`,
  );
  checks.push({ detail: `${running.n} runs still 'running'`, name: "no run left running", pass: running.n === 0 });

  // Disappeared rows are consistent (flag <=> timestamp).
  const disappearedBad = await one<{ n: number }>(
    `SELECT count(*)::int AS n FROM licenses WHERE (disappeared_from_source AND disappeared_at IS NULL) OR (NOT disappeared_from_source AND disappeared_at IS NOT NULL)`,
  );
  checks.push({ detail: `${disappearedBad.n} inconsistent rows`, name: "disappeared flag/timestamp consistent", pass: disappearedBad.n === 0 });

  // Dedupe decisions: every merged decision has a business; every cluster has >= 2 licenses.
  const badDecisions = await one<{ n: number }>(
    `SELECT count(*)::int AS n FROM dedupe_decisions WHERE (decision = 'merged' AND business_id IS NULL) OR cardinality(license_ids) < 2`,
  );
  checks.push({ detail: `${badDecisions.n} malformed decisions`, name: "dedupe decisions well-formed", pass: badDecisions.n === 0 });

  // Gates: nothing is published yet (Sprint 01 loads data, it does not publish).
  const published = await one<{ n: number }>(
    `SELECT count(*)::int AS n FROM licenses WHERE data_published_at IS NOT NULL OR seo_index_published_at IS NOT NULL`,
  );
  checks.push({ detail: `${published.n} licenses with a gate set`, name: "no publication gates set (load only)", pass: published.n === 0 });

  const size = psqlScalar(db, `SELECT pg_size_pretty(pg_database_size(current_database()));`);
  console.log(`database: ${db}  size: ${size}`);
  let failed = 0;
  for (const c of checks) {
    console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name} — ${c.detail}`);
    if (!c.pass) failed += 1;
  }
  console.log(`${checks.length - failed}/${checks.length} checks passed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(`VERIFY FAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
