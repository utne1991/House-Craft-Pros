// ETL pipeline driver — download → parse → normalize → dedupe → load → verify.
// Usage:
//   node src/run.ts --source tdlr-electrical [--file /path/to/file.csv]
//   node src/run.ts --all
//   node src/run.ts --source tsbpe-rmp --staging /tmp/hcp-etl
//
// Fresh download is the default. --file supplies a local file instead
// (fallback only); the run notes record that fact and its as-of date.
// Raw CSVs stay OUT of the repo: staging lives under /tmp (or --staging).
// See etl/README.md for the full procedure and the psql loading mechanism.

import { createHash, randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkAnomalies } from "./anomaly.ts";
import { parseCsv, validateHeader } from "./csv.ts";
import {
  businessRows,
  dedupe,
} from "./dedupe.ts";
import {
  normalizeRow,
  parseUsDate,
  type NormalizeContext,
  type NormalizedRecord,
} from "./normalize.ts";
import { DB_NAME, psqlFile, psqlJson, psqlQuery } from "./pg.ts";
import { buildRunSql, writeStagingFiles, type StagingBusiness } from "./sqlgen.ts";
import { assertValidRecord } from "./validate.ts";

interface SourceConfig {
  agency: string;
  code: string;
  download_url: string;
  file_date_rule: string;
  file_name: string;
  has_status_field: boolean;
  landing_page_url: string;
  license_type_label: string;
  required_headers: string[];
  trade: string;
}

interface EtlConfig {
  anomaly_thresholds: {
    expired_share_jump_points: number;
    parse_error_pct: number;
    row_count_jump_pct: number;
    unparseable_date_pct: number;
  };
  contract_version: string;
  db_name: string;
  sources: SourceConfig[];
  stale_running_hours: number;
}

const CONFIG_PATH = fileURLToPath(new URL("../config/sources.json", import.meta.url));
const CONFIG: EtlConfig = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));

const USER_AGENT =
  "House-Craft-Pros-ETL/1.0 (research; contact: hubercenter.com)";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sqlQuote(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

interface PreviousRun {
  expired_share_pct: number | null;
  id: string;
  row_count_loaded: number | null;
}

async function previousSuccessfulRun(sourceCode: string): Promise<PreviousRun | null> {
  // O-2 (etl-pipeline.md §8): "last good run" = the latest `succeeded` run
  // for the source, found by query. No pointer column is added.
  const rows = await psqlJson<Array<{ id: string; row_count_loaded: number | null }>>(
    DB_NAME,
    `SELECT COALESCE(json_agg(t), '[]'::json) FROM (
       SELECT r.id, r.row_count_loaded
       FROM ingestion_runs r JOIN data_sources s ON s.id = r.source_id
       WHERE s.code = '${sourceCode}' AND r.status = 'succeeded'
       ORDER BY r.finished_at DESC NULLS LAST, r.started_at DESC LIMIT 1
     ) t;`,
  );
  if (rows.length === 0) return null;
  // Expired share baseline: current DB state for this source (the best
  // available proxy — the previous run's share is not stored per-run).
  const share = await psqlJson<Array<{ pct: number | null }>>(
    DB_NAME,
    `SELECT COALESCE(json_agg(t), '[]'::json) FROM (
       SELECT CASE WHEN count(*) = 0 THEN NULL
         ELSE 100.0 * count(*) FILTER (WHERE license_status = 'expired') / count(*)
         END AS pct
       FROM licenses l JOIN data_sources s ON s.id = l.source_id
       WHERE s.code = '${sourceCode}'
     ) t;`,
  );
  return {
    expired_share_pct: share[0]?.pct ?? null,
    id: rows[0].id,
    row_count_loaded: rows[0].row_count_loaded,
  };
}

function markStaleRunning(): void {
  psqlQuery(
    DB_NAME,
    `UPDATE ingestion_runs SET status = 'failed',
       error_message = 'stale — superseded by a later run',
       finished_at = now()
     WHERE status = 'running'
       AND started_at < now() - interval '${CONFIG.stale_running_hours} hours';`,
  );
}

function createOrReuseRunRow(opts: {
  fileDate: string | null;
  notes: string;
  runId: string;
  sha256: string;
  sourceCode: string;
  sourceUrl: string | null;
  status: string;
}): string {
  // A retry after a FAILED run reuses the same (source, checksum) row:
  // the unique index on (source_id, sha256_checksum) forbids a second row,
  // and the old row keeps its id — so the loader must use THAT id, not a
  // fresh UUID, or the FKs from businesses/licenses will fail.
  const existing = psqlJson<Array<{ id: string }>>(
    DB_NAME,
    `SELECT COALESCE(json_agg(t), '[]'::json) FROM (
       SELECT r.id FROM ingestion_runs r JOIN data_sources s ON s.id = r.source_id
       WHERE s.code = '${opts.sourceCode}' AND r.sha256_checksum = '${opts.sha256}' LIMIT 1
     ) t;`,
  );
  if (existing.length > 0) {
    const id = existing[0].id;
    psqlQuery(
      DB_NAME,
      `UPDATE ingestion_runs SET status = '${opts.status}', finished_at = NULL,
         error_message = NULL, notes = ${sqlQuote(opts.notes)},
         source_url = ${sqlQuote(opts.sourceUrl)}, file_date = ${sqlQuote(opts.fileDate)}
       WHERE id = '${id}';`,
    );
    return id;
  }
  psqlQuery(
    DB_NAME,
    `INSERT INTO ingestion_runs (id, source_id, contract_version, status, source_url, file_date, sha256_checksum, notes)
     SELECT '${opts.runId}', s.id, '${CONFIG.contract_version}', '${opts.status}',
       ${sqlQuote(opts.sourceUrl)}, ${sqlQuote(opts.fileDate)}, '${opts.sha256}',
       ${sqlQuote(opts.notes)}
     FROM data_sources s WHERE s.code = '${opts.sourceCode}';`,
  );
  return opts.runId;
}

function markRunFailed(runId: string, error: string): void {
  psqlQuery(
    DB_NAME,
    `UPDATE ingestion_runs SET status = 'failed', finished_at = now(),
       error_message = ${sqlQuote(error.slice(0, 1000))} WHERE id = '${runId}';`,
  );
}

async function runSource(
  source: SourceConfig,
  opts: { file?: string; staging: string },
): Promise<{ runId: string; status: string; summary: Record<string, unknown> }> {
  const runDate = todayIso();
  const stagingDir = join(opts.staging, "staging", source.code);
  mkdirSync(stagingDir, { recursive: true });
  // umask here is 0007 (group-only dirs); the postgres user must be able
  // to traverse staging dirs and read the files psql loads.
  chmodSync(join(opts.staging), 0o755);
  chmodSync(join(opts.staging, "staging"), 0o755);
  chmodSync(stagingDir, 0o755);
  let runId = randomUUID();

  // ---- Stage 1: download ----
  let bytes: Buffer;
  let sourceUrl: string | null;
  let fileDate: string | null = null;
  let downloadNote: string;
  if (opts.file) {
    bytes = readFileSync(opts.file);
    sourceUrl = null;
    downloadNote = `local file supplied: ${opts.file} (fallback — no fresh download; as-of date unknown, status_as_of = run date ${runDate})`;
  } else {
    sourceUrl = source.download_url;
    const res = await fetch(sourceUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      throw new Error(`download failed: HTTP ${res.status} for ${sourceUrl}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) throw new Error(`download failed: empty body for ${sourceUrl}`);
    bytes = buf;
    const lastModified = res.headers.get("last-modified");
    if (source.file_date_rule === "last-modified-header" && lastModified) {
      fileDate = new Date(lastModified).toISOString().slice(0, 10);
    }
    downloadNote =
      `fresh download from ${sourceUrl} on ${runDate}` +
      (fileDate ? `; file Last-Modified ${fileDate}` : "; source states no file date");
  }
  const sha256 = sha256Hex(bytes);
  const filePath = join(stagingDir, source.file_name);
  writeFileSync(filePath, bytes);
  const asOfDate = fileDate ?? runDate;

  markStaleRunning();

  // ---- Idempotency (D5 / L2): same SHA-256 already succeeded = no-op.
  // The UNIQUE (source_id, sha256_checksum) index makes a second run row
  // impossible, so the no-op is reported (not recorded as a new run row):
  // "duplicate of run <id>".
  const dup = await psqlJson<Array<{ id: string }>>(
    DB_NAME,
    `SELECT COALESCE(json_agg(t), '[]'::json) FROM (
       SELECT r.id FROM ingestion_runs r JOIN data_sources s ON s.id = r.source_id
       WHERE s.code = '${source.code}' AND r.sha256_checksum = '${sha256}'
         AND r.status = 'succeeded' LIMIT 1
     ) t;`,
  );
  if (dup.length > 0) {
    const summary = {
      file_date: fileDate,
      note: `duplicate of run ${dup[0].id} — no-op, nothing loaded`,
      sha256,
      source: source.code,
      status: "duplicate_noop",
    };
    console.log(JSON.stringify(summary, null, 2));
    return { runId: dup[0].id, status: "duplicate_noop", summary };
  }

  // ---- Stage 2: parse ----
  const text = bytes.toString("utf8");
  const parsed = parseCsv(text);
  const headerCheck = validateHeader(parsed.header, source.required_headers);
  if (headerCheck.missing.length > 0) {
    const msg = `header validation failed: missing required columns: ${headerCheck.missing.join(", ")}`;
    createOrReuseRunRow({
      fileDate,
      notes: `${downloadNote}. ${msg}`,
      runId,
      sha256,
      sourceCode: source.code,
      sourceUrl,
      status: "failed",
    });
    throw new Error(msg);
  }
  if (headerCheck.extra.length > 0) {
    console.log(`note: extra columns ignored for ${source.code}: ${headerCheck.extra.join(", ")}`);
  }
  const downloaded = parsed.rows.length + parsed.errors.length;

  // ---- Stage 3: normalize ----
  const ctx: NormalizeContext = {
    asOfDate,
    fileDate,
    fileName: source.file_name,
    sha256,
    sourceCode: source.code,
    sourceUrl,
    trade: source.trade,
  };
  const records: NormalizedRecord[] = [];
  const normalizeErrors: Array<{ reason: string; row: number }> = [];
  let unparseableDates = 0;
  parsed.rows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 header, +1 for 1-based
    try {
      const rec = normalizeRow(row, ctx, rowNumber);
      assertValidRecord(rec);
      records.push(rec);
      const expRaw =
        source.code === "tsbpe-rmp"
          ? row["EXPIRATION_DTE"]
          : row["LICENSE EXPIRATION DATE"];
      if (
        expRaw !== undefined &&
        expRaw.trim() !== "" &&
        parseUsDate(expRaw) === null
      ) {
        unparseableDates += 1;
      }
    } catch (e) {
      normalizeErrors.push({
        reason: e instanceof Error ? e.message : String(e),
        row: rowNumber,
      });
    }
  });
  const parseErrors = [...parsed.errors, ...normalizeErrors];
  const parseErrorRatePct =
    downloaded === 0 ? 0 : (parseErrors.length / downloaded) * 100;
  const expiredCount = records.filter((r) => r.license_status === "expired").length;
  const expiredSharePct =
    records.length === 0 ? 0 : (expiredCount / records.length) * 100;
  const identities = new Set(
    records.map((r) => `${r.license_type}\n${r.license_number}`),
  );
  const duplicateIdentityCount = records.length - identities.size;

  // ---- Stage 4: dedupe ----
  const deduped = dedupe(records);
  const bizRows = businessRows(records, deduped);
  const stagingBusinesses: StagingBusiness[] = bizRows.map((b) => ({
    ...b,
    id: randomUUID(),
    stateCode: b.address?.state ?? "TX",
  }));

  // ---- Stage 6 (pre-load part): anomaly gate vs last GOOD run ----
  const prev = await previousSuccessfulRun(source.code);
  const verdict = checkAnomalies(
    {
      currentRowCount: records.length,
      duplicateIdentityCount,
      expiredSharePct,
      parseErrorCount: parseErrors.length,
      parseErrorRatePct,
      previousExpiredSharePct: prev?.expired_share_pct ?? null,
      previousRowCount: prev?.row_count_loaded ?? null,
      unparseableDateCount: unparseableDates,
      unparseableDateRatePct:
        records.length === 0 ? 0 : (unparseableDates / records.length) * 100,
    },
    CONFIG.anomaly_thresholds,
  );
  const anomalyNotes = verdict.checks
    .map(
      (c) =>
        `${c.name}: ${c.observed} [threshold: ${c.threshold}]${c.blocked ? " — BLOCKED" : ""}`,
    )
    .join("; ");
  if (verdict.blocked) {
    createOrReuseRunRow({
      fileDate,
      notes: `${downloadNote}. ANOMALY: ${anomalyNotes}`,
      runId,
      sha256,
      sourceCode: source.code,
      sourceUrl,
      status: "blocked_anomaly",
    });
    throw new Error(`anomaly gate blocked ${source.code}: ${anomalyNotes}`);
  }

  // ---- Stage 5: load ----
  const loadDir = join(opts.staging, "load", source.code);
  mkdirSync(loadDir, { recursive: true });
  chmodSync(join(opts.staging, "load"), 0o755);
  chmodSync(loadDir, 0o755);
  const assignmentsBusinessKey = deduped.assignments.map((a) => a.businessKey);
  writeStagingFiles(loadDir, records, assignmentsBusinessKey, stagingBusinesses, deduped.decisions);
  for (const f of ["licenses.tsv", "businesses.tsv", "dedupe.tsv"]) {
    chmodSync(join(loadDir, f), 0o644);
  }
  const runNotes =
    `${downloadNote}. Anomaly checks passed: ${anomalyNotes}. ` +
    `Config: etl/config/sources.json (contract ${CONFIG.contract_version}).`;
  // Reuse the existing run-row id on retry (see createOrReuseRunRow).
  runId = createOrReuseRunRow({
    fileDate,
    notes: runNotes,
    runId,
    sha256,
    sourceCode: source.code,
    sourceUrl,
    status: "running",
  });
  const runSql = buildRunSql({
    dir: loadDir,
    downloaded,
    notes: runNotes,
    parsed: records.length,
    runId,
    sourceCode: source.code,
    trade: source.trade,
  });
  const runSqlPath = join(loadDir, "run.sql");
  writeFileSync(runSqlPath, runSql, "utf8");
  chmodSync(runSqlPath, 0o644);
  try {
    psqlFile(DB_NAME, runSqlPath);
  } catch (e) {
    markRunFailed(runId, e instanceof Error ? e.message : String(e));
    throw e;
  }

  // ---- Stage 6 (post-load): verification / reconciliation ----
  // Count ONLY the rows this run touched (ingestion_run_id = this run):
  // disappeared rows from earlier runs still exist in the table and must
  // NOT be counted against the current file (V2).
  const counts = await psqlJson<
    Array<{
      businesses: number;
      dedupe_held: number;
      dedupe_merged: number;
      history_rows: number;
      licenses: number;
      licenses_active: number;
      licenses_expired: number;
      licenses_unknown: number;
    }>
  >(
    DB_NAME,
    `SELECT COALESCE(json_agg(t), '[]'::json) FROM (
       SELECT
         (SELECT count(*) FROM licenses l WHERE l.ingestion_run_id = '${runId}') AS licenses,
         (SELECT count(*) FROM licenses l WHERE l.ingestion_run_id = '${runId}' AND l.license_status = 'active') AS licenses_active,
         (SELECT count(*) FROM licenses l WHERE l.ingestion_run_id = '${runId}' AND l.license_status = 'expired') AS licenses_expired,
         (SELECT count(*) FROM licenses l WHERE l.ingestion_run_id = '${runId}' AND l.license_status = 'unknown') AS licenses_unknown,
         (SELECT count(DISTINCT business_id) FROM licenses l JOIN data_sources s ON s.id = l.source_id WHERE s.code = '${source.code}') AS businesses,
         (SELECT count(*) FROM license_status_history h WHERE h.run_id = '${runId}') AS history_rows,
         (SELECT count(*) FROM dedupe_decisions d WHERE d.run_id = '${runId}' AND d.decision = 'merged') AS dedupe_merged,
         (SELECT count(*) FROM dedupe_decisions d WHERE d.run_id = '${runId}' AND d.decision IN ('held_ambiguous','rejected_no_merge')) AS dedupe_held
     ) t;`,
  );
  const c = counts[0];
  const reconciliationOk =
    c.licenses === records.length && c.licenses_active + c.licenses_expired + c.licenses_unknown === records.length;
  const summary: Record<string, unknown> = {
    businesses_for_source: c.businesses,
    dedupe_decisions_held: c.dedupe_held,
    dedupe_decisions_merged: c.dedupe_merged,
    downloaded,
    expired: expiredCount,
    file_date: fileDate,
    history_rows: c.history_rows,
    licenses_loaded: c.licenses,
    parsed: records.length,
    parse_errors: parseErrors.length,
    reconciliation_ok: reconciliationOk,
    run_id: runId,
    sha256,
    source: source.code,
    source_url: sourceUrl,
    status: "succeeded",
  };
  const summaryPath = join(loadDir, "run-summary.json");
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));
  if (!reconciliationOk) {
    throw new Error(
      `reconciliation failed for ${source.code}: DB licenses=${c.licenses} vs parsed=${records.length}`,
    );
  }
  return { runId, status: "succeeded", summary };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const staging = (args["staging"] as string) ?? "/tmp/hcp-etl";
  const codes: string[] =
    args["all"] === true
      ? CONFIG.sources.map((s) => s.code)
      : args["source"]
        ? [args["source"] as string]
        : [];
  if (codes.length === 0) {
    console.error("usage: node src/run.ts --source <code> [--file <path>] | --all");
    process.exit(2);
  }
  for (const code of codes) {
    const source = CONFIG.sources.find((s) => s.code === code);
    if (!source) {
      console.error(`unknown source: ${code}`);
      process.exit(2);
    }
    const file = args["file"] as string | undefined;
    if (file && codes.length > 1) {
      console.error("--file can only be used with a single --source");
      process.exit(2);
    }
    await runSource(source, { file, staging });
  }
}

main().catch((e) => {
  console.error(`ETL FAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
