// Human review workflow for held dedupe clusters (Sprint 02, US3).
//
// The ETL never auto-merges a name-only cluster: it records decision
// 'held_ambiguous' in dedupe_decisions and leaves each license in its own
// 'ambiguous_held' business. A HUMAN then decides, cluster by cluster:
//
//   --list                  clusters still awaiting review
//   --show <cluster_key>    the licenses + businesses + evidence of one cluster
//   --decide <key> --decision merge|keep-separate --by <identifier> [--note ...]
//                           (prints a plan; executes only with --confirm)
//
// Rules:
// - Only a human decides (decided_by is always 'human:<identifier>'; the
//   --by flag is required and has no default). The tool never decides alone.
// - merge: all licenses of the cluster move into ONE business (the one
//   holding the most licenses; ties break on contact completeness, then
//   earliest created). Emptied business rows are DELETED in the same
//   transaction, with an audit_logs row each (actor 'human:<by>', action
//   'review.merge') so the removal stays traceable. The target becomes
//   dedupe_status 'merged' and one dedupe_decisions row records the merge.
//   The transaction rolls back whole on any error (e.g. a business with a
//   claim/correction blocks the DELETE through its foreign key).
// - keep-separate: records one 'rejected_no_merge' decision; no data moves.
// - A cluster whose latest decision is not held_ambiguous (already decided
//   by a human, or merged by the ETL) cannot be decided again.
// - Everything runs locally against the local Postgres (psql via pg.ts).
//   No deploy, no production database.

import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DB_NAME, psqlFile, psqlJson } from "./pg.ts";

export interface HeldClusterSummary {
  business_count: number;
  cluster_key: string;
  decided_at: string;
  license_count: number;
  license_numbers: string[];
}

export interface ClusterLicense {
  business_id: string;
  expiration_date: string | null;
  id: string;
  license_number: string;
  license_status: string;
  license_type: string;
  trade: string;
  verification_level: string;
}

export interface ClusterBusiness {
  address_line1: string | null;
  city: string | null;
  county: string | null;
  created_at: string;
  dedupe_status: string;
  id: string;
  license_count: number;
  name: string;
  phone: string | null;
  zip: string | null;
}

export interface ClusterDetail {
  businesses: ClusterBusiness[];
  cluster_key: string;
  latest_decision: {
    decided_at: string;
    decided_by: string;
    decision: string;
    rationale: string;
  } | null;
  licenses: ClusterLicense[];
}

export interface MergePlan {
  action: "merge";
  businesses_to_remove: Array<{ id: string; license_count: number; name: string }>;
  cluster_key: string;
  license_ids: string[];
  licenses_to_move: Array<{ from_business_id: string; id: string; license_number: string }>;
  target_business: { id: string; name: string };
}

export interface MergeResult {
  action: "merged";
  businesses_removed: string[];
  cluster_key: string;
  decided_by: string;
  licenses_moved: number;
  target_business_id: string;
}

export interface KeepSeparateResult {
  action: "kept_separate";
  cluster_key: string;
  decided_by: string;
  decision: "rejected_no_merge";
}

function sqlQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlUuidArray(ids: string[]): string {
  return `ARRAY[${ids.map((id) => sqlQuote(id)).join(",")}]::uuid[]`;
}

/** Latest dedupe decision per cluster, keeping only still-held clusters. */
export function listHeldClusters(db: string = DB_NAME, limit = 50): HeldClusterSummary[] {
  const rows = psqlJson<Array<{ cluster_key: string; decided_at: string }>>(
    db,
    `SELECT COALESCE(json_agg(t), '[]'::json) FROM (
       SELECT cluster_key, decided_at FROM (
         SELECT DISTINCT ON (cluster_key) cluster_key, decided_at, decision
         FROM dedupe_decisions
         ORDER BY cluster_key, decided_at DESC, id DESC
       ) latest
       WHERE decision = 'held_ambiguous'
       ORDER BY decided_at ASC
       LIMIT ${Math.max(1, Math.floor(limit))}
     ) t;`,
  );
  return rows.map((r) => {
    const detail = showCluster(db, r.cluster_key);
    return {
      business_count: detail.businesses.length,
      cluster_key: r.cluster_key,
      decided_at: r.decided_at,
      license_count: detail.licenses.length,
      license_numbers: detail.licenses.map((l) => l.license_number),
    };
  });
}

/** Live state of one cluster: licenses + businesses + latest decision. */
export function showCluster(db: string, clusterKey: string): ClusterDetail {
  const decisions = psqlJson<
    Array<{ decided_at: string; decided_by: string; decision: string; rationale: string }>
  >(
    db,
    `SELECT COALESCE(json_agg(t), '[]'::json) FROM (
       SELECT decided_at::text AS decided_at, decided_by, decision, rationale
       FROM dedupe_decisions
       WHERE cluster_key = ${sqlQuote(clusterKey)}
       ORDER BY decided_at DESC, id DESC
       LIMIT 1
     ) t;`,
  );
  const licenses = psqlJson<ClusterLicense[]>(
    db,
    `SELECT COALESCE(json_agg(t), '[]'::json) FROM (
       SELECT l.id::text AS id, l.license_number, l.license_type, l.trade,
         l.license_status, l.verification_level,
         l.expiration_date::text AS expiration_date,
         l.business_id::text AS business_id
       FROM licenses l
       JOIN businesses b ON b.id = l.business_id
       WHERE b.normalized_name = ${sqlQuote(clusterKey)}
       ORDER BY l.license_number
     ) t;`,
  );
  const businesses = psqlJson<ClusterBusiness[]>(
    db,
    `SELECT COALESCE(json_agg(t), '[]'::json) FROM (
       SELECT b.id::text AS id, b.name, b.phone, b.address_line1, b.city,
         b.county, b.zip, b.dedupe_status, b.created_at::text AS created_at,
         (SELECT count(*) FROM licenses l WHERE l.business_id = b.id) AS license_count
       FROM businesses b
       WHERE b.normalized_name = ${sqlQuote(clusterKey)}
       ORDER BY license_count DESC, b.created_at ASC
     ) t;`,
  );
  return {
    businesses,
    cluster_key: clusterKey,
    latest_decision: decisions[0] ?? null,
    licenses,
  };
}

function requireAwaitingReview(detail: ClusterDetail): void {
  if (detail.latest_decision === null) {
    throw new Error(`cluster ${JSON.stringify(detail.cluster_key)} has no dedupe decision at all`);
  }
  if (detail.latest_decision.decision !== "held_ambiguous") {
    throw new Error(
      `cluster ${JSON.stringify(detail.cluster_key)} is not awaiting review ` +
        `(latest decision: ${detail.latest_decision.decision} by ${detail.latest_decision.decided_by})`,
    );
  }
  if (detail.licenses.length < 2) {
    throw new Error(
      `cluster ${JSON.stringify(detail.cluster_key)} has only ${detail.licenses.length} license(s) live; a merge/keep-separate decision needs >= 2`,
    );
  }
}

function requireBy(by: string): string {
  const clean = by.trim();
  if (clean === "") throw new Error("--by <identifier> is required: a human must own the decision");
  if (clean.toLowerCase().startsWith("human:")) return clean.slice("human:".length);
  return clean;
}

/** Pick the merge target: most licenses, then most contact evidence, then earliest. */
export function planMerge(db: string, clusterKey: string): MergePlan {
  const detail = showCluster(db, clusterKey);
  requireAwaitingReview(detail);
  const scored = detail.businesses.map((b) => ({
    business: b,
    completeness: (b.phone ? 1 : 0) + (b.address_line1 ? 1 : 0),
  }));
  scored.sort(
    (a, b) =>
      b.business.license_count - a.business.license_count ||
      b.completeness - a.completeness ||
      (a.business.created_at < b.business.created_at ? -1 : 1),
  );
  const target = scored[0].business;
  const toRemove = detail.businesses.filter((b) => b.id !== target.id);
  return {
    action: "merge",
    businesses_to_remove: toRemove.map((b) => ({ id: b.id, license_count: b.license_count, name: b.name })),
    cluster_key: clusterKey,
    license_ids: detail.licenses.map((l) => l.id),
    licenses_to_move: detail.licenses
      .filter((l) => l.business_id !== target.id)
      .map((l) => ({ from_business_id: l.business_id, id: l.id, license_number: l.license_number })),
    target_business: { id: target.id, name: target.name },
  };
}

function runTransaction(db: string, sql: string): void {
  const dir = mkdtempSync(join(tmpdir(), "hcp-review-"));
  const file = join(dir, "txn.sql");
  writeFileSync(file, sql, "utf8");
  chmodSync(dir, 0o755);
  chmodSync(file, 0o644);
  psqlFile(db, file);
}

/** Execute a planned merge in one transaction. Throws (nothing applied) on any error. */
export function applyMerge(db: string, clusterKey: string, by: string, note?: string): MergeResult {
  const reviewer = requireBy(by);
  const plan = planMerge(db, clusterKey);
  const rationale =
    note?.trim() ||
    `human review: merged ${plan.license_ids.length} licenses into one business on name + reviewer judgement (held cluster ${clusterKey})`;
  const removedIds = plan.businesses_to_remove.map((b) => b.id);
  const stmts: string[] = ["BEGIN;"];
  for (const b of plan.businesses_to_remove) {
    stmts.push(
      `INSERT INTO audit_logs (actor, action, table_name, record_id, new_values) VALUES (${sqlQuote(`human:${reviewer}`)}, 'review.merge', 'businesses', ${sqlQuote(b.id)}::uuid, jsonb_build_object('merged_into_business_id', ${sqlQuote(plan.target_business.id)}, 'cluster_key', ${sqlQuote(clusterKey)}, 'licenses_held', ${b.license_count}));`,
    );
  }
  if (plan.licenses_to_move.length > 0) {
    stmts.push(
      `UPDATE licenses SET business_id = ${sqlQuote(plan.target_business.id)}::uuid WHERE id = ANY(${sqlUuidArray(plan.licenses_to_move.map((l) => l.id))});`,
    );
  }
  if (removedIds.length > 0) {
    stmts.push(`DELETE FROM businesses WHERE id = ANY(${sqlUuidArray(removedIds)});`);
  }
  stmts.push(
    `UPDATE businesses SET dedupe_status = 'merged' WHERE id = ${sqlQuote(plan.target_business.id)}::uuid;`,
    `INSERT INTO dedupe_decisions (run_id, cluster_key, license_ids, business_id, decision, rationale, decided_by) VALUES (NULL, ${sqlQuote(clusterKey)}, ${sqlUuidArray(plan.license_ids)}, ${sqlQuote(plan.target_business.id)}::uuid, 'merged', ${sqlQuote(rationale)}, ${sqlQuote(`human:${reviewer}`)});`,
    "COMMIT;",
  );
  runTransaction(db, stmts.join("\n"));
  return {
    action: "merged",
    businesses_removed: removedIds,
    cluster_key: clusterKey,
    decided_by: `human:${reviewer}`,
    licenses_moved: plan.licenses_to_move.length,
    target_business_id: plan.target_business.id,
  };
}

/** Record "keep separate": one decision row, no data moves. */
export function applyKeepSeparate(db: string, clusterKey: string, by: string, note?: string): KeepSeparateResult {
  const reviewer = requireBy(by);
  const detail = showCluster(db, clusterKey);
  requireAwaitingReview(detail);
  const rationale =
    note?.trim() ||
    `human review: kept separate — same name, evidence does not show one business (held cluster ${clusterKey})`;
  runTransaction(
    db,
    [
      "BEGIN;",
      `INSERT INTO dedupe_decisions (run_id, cluster_key, license_ids, business_id, decision, rationale, decided_by) VALUES (NULL, ${sqlQuote(clusterKey)}, ${sqlUuidArray(detail.licenses.map((l) => l.id))}, NULL, 'rejected_no_merge', ${sqlQuote(rationale)}, ${sqlQuote(`human:${reviewer}`)});`,
      "COMMIT;",
    ].join("\n"),
  );
  return {
    action: "kept_separate",
    cluster_key: clusterKey,
    decided_by: `human:${reviewer}`,
    decision: "rejected_no_merge",
  };
}
