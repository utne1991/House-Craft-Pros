# ETL Pipeline — Stage Contracts (Sprint 01)

**Status:** proposed (Sprint 01) · **Date:** 25/11/2026 · **Contract:** `v1`
**Owner of this doc:** Worker B (data model). **Implementer:** Worker C (ETL
engine) — implement TO this contract; if a stage cannot meet its contract,
say so in the dry-run report with reason + residual risk, do not silently
weaken the contract.
**Related:** `docs/architecture/data-contract.md` (interfaces + versioning),
`docs/architecture/data-model.md` (tables), `data-dictionary.md` (columns),
`etl/contract/normalized-record.v1.json` (record schema), Sprint 01
`docs/specs/sprint-01/spec.md` (US1–US7, US9).

**Non-goals for this sprint:** no Next.js code, no Verify UI, no sitemap, no
production load, no Rust engine, no microservices, no Bee Core Engine (§7).

---

## 1. Pipeline at a glance

```
download → parse → normalize → dedupe → load → verify
   (1)        (2)       (3)        (4)      (5)     (6)
```

One **run** = one execution of the pipeline for ONE source (one
`ingestion_runs` row per source per execution). A daily run therefore creates
up to 3 run rows (TDLR electrical, TDLR HVAC, TSBPE RMP). Runs for different
sources are independent: one source failing must not block the others, and
must not change anything in the database for that source.

**Invariants across all stages:**
- **No fabricated data.** Every number traces to a source file + checksum.
  A field the source does not have is NULL, never guessed or backfilled from
  another column (notably: never substitute the TDLR mailing phone for the
  business phone).
- **No "Verified" without authority confirmation.** The split
  (`license_status` vs `verification_level`) is enforced at normalize time
  (schema), load time (loader), and storage time (DB CHECK).
- **Raw CSVs stay out of the repo.** Staging only, e.g.
  `~/workspace/trades-directory/research/raw/` or `/tmp`. Record URL, file
  date, row count, SHA-256 for every download in `ingestion_runs`.
- **PostgreSQL is the canonical target.** Migrations target Postgres. Any
  stand-in used for a dry-run is labeled as a stand-in (ADR-0002).
- **The engine imports nothing from Next.js** and contains no frontend code.

## 2. Stage contracts

Each stage lists: input → output, the interface it implements, its rules, and
its failure mode. A stage that fails MUST stop the pipeline for that source
before the next stage writes anything (fail-closed), except where a stage
explicitly defines a recoverable path.

### Stage 1 — Download

| | |
|---|---|
| **Input** | Source config (§6): URL(s), expected file name, retry limit, timeout |
| **Output** | `{ bytes, sha256_checksum, source_url, file_date \| null }` + a created `ingestion_runs` row (`status='running'`) |
| **Interface** | Source adapter `fetch(config)` — see `data-contract.md` §3 |
| **Rules** | D1. Record the EXACT URL actually fetched in `ingestion_runs.source_url`. D2. Compute SHA-256 over the downloaded bytes and store it. D3. `file_date`: the source file's as-of date when the source states one; else NULL (the run date is used as `status_as_of` downstream — and recorded as the run date, not the file date). D4. Keep the raw file in local staging only (never in the repo). D5. If the same SHA-256 was already ingested successfully for this source (unique index on `(source_id, sha256_checksum)`), the run ends immediately as a no-op: mark the run `succeeded` with a note "duplicate of run <id>", load nothing. |
| **Failure mode** | HTTP failure, empty body, unexpected content-type, timeout after retries → run row marked `failed` with `error_message`; NOTHING is written to any other table. A missing exact URL is not a failure of this stage — it is a [NEEDS CLARIFICATION] (NC-1/NC-2) resolved by recording the method used (see §8). |

### Stage 2 — Parse

| | |
|---|---|
| **Input** | Downloaded bytes + source config (expected headers) |
| **Output** | `RawRow[]` — verbatim rows (header name → raw cell string, untrimmed values preserved) + `row_count_parsed` + a list of parse errors (row number + reason) |
| **Interface** | Source adapter `parse(bytes, config)` |
| **Rules** | P1. Validate the header row against the expected columns for the source (see `data-contract.md` §2 mapping). A missing REQUIRED column or a renamed header is a HARD failure: stop before loading. P2. Unknown EXTRA columns are ignored (logged), never fatal — sources add columns over time. P3. Handle the real file quirks: UTF-8 with possible BOM; quoted fields containing commas; leading spaces in values (TDLR dates arrive as ` 07/31/2027`); CRLF line endings; a possible trailing junk/footer line (the Socrata dataset is known to contain footer-text rows — the CSVs must be checked for the same and any non-data row counted as a parse error, never loaded). P4. A row with no license number is a PARSE ERROR (counted, reported with row number), never loaded with a fabricated number. P5. `row_count_parsed` = rows that parsed; parse errors are counted separately and reported. |
| **Failure mode** | Header validation failure (P1) or a parse-error rate above the configured threshold (default: any parse error in the header + >1% of rows — configurable per source, see §6) → run marked `failed` (or `blocked_anomaly` if the anomaly check in Stage 6 trips first); nothing is loaded. |

### Stage 3 — Normalize

| | |
|---|---|
| **Input** | `RawRow[]` + source config + file date + run context |
| **Output** | `NormalizedRecord[]` conforming to `etl/contract/normalized-record.v1.json` + per-row normalization notes |
| **Interface** | Source adapter `normalize(row, context)`; schema: `etl/contract/normalized-record.v1.json` |
| **Rules** | N1. Pure function of (row, config, file date): no network, no DB, no global state — so it is unit-testable and portable to Rust later. N2. Apply the §2 mapping in `data-contract.md` exactly. N3. Enforce invariants I1–I4: status derivation (TDLR → `expiration_date` + `inferred`; TSBPE → `source_field` + `authority-confirmed` for the status value); no invented identity (empty → NULL); provenance mandatory (checksum + file name); dates converted to ISO `YYYY-MM-DD`, unparseable → NULL + `verification_level='unverified'` with a note. N4. `business_name_normalized`: lowercase, strip punctuation, collapse whitespace — deterministic (same input → same output). N5. `phone_normalized`: 10 US digits (strip formatting, drop leading `1`); NULL when unparseable. N6. Every record carries `contract_version` (`"v1"`). N7. Validate EVERY record against the JSON Schema before passing it on; an invalid record fails the run (L1). N8. `business_name` NULL (HVAC 2.1%, RMP 0.1%) stays NULL in the record — the holder-name fallback for `businesses.name` is a LOAD-time rule, not a normalize-time invention. |
| **Failure mode** | Any record failing schema validation → run `failed`, nothing loaded. (A single bad row fails the run: a bad file must never partially load. If the Owner later wants per-row quarantine instead, that is a contract change, not an implementer decision.) |

### Stage 4 — Dedupe

| | |
|---|---|
| **Input** | `NormalizedRecord[]` (this run) + existing `businesses`/`licenses` (for cross-run matching) |
| **Output** | Business assignments: for each license, a `business_id` (existing or newly created) + `dedupe_decisions` rows for every cluster decided about |
| **Interface** | Dedupe is a loader sub-step with its own contract (this section); it writes `businesses` + `dedupe_decisions` |
| **Rules** | Dd1. **Conservative merge (US3):** merge ONLY on name + address/phone evidence — same `normalized_name` AND (same `phone_normalized` OR same normalized address (line1 + city + ZIP)). Dd2. **Name-only clusters are NEVER auto-merged:** same name but different/missing address and phone → `dedupe_decisions` row with `decision='held_ambiguous'`, `business_id` NULL, `decided_by='etl'`, and the licenses stay on SEPARATE business rows (`dedupe_status='ambiguous_held'`). Dd3. Every cluster of ≥2 candidate licenses gets a `dedupe_decisions` row (merged / held_ambiguous / rejected_no_merge) with a `rationale` naming the evidence matched or missing. Dd4. A merge decision is recorded BEFORE the business row is created, so the decision is auditable even if the load later rolls back (the decision row is part of the same transaction — it rolls back with the load, which is correct: no decision without a load). Dd5. Deterministic: same input + same DB state → same decisions (no randomness, no wall-clock in the decision). Dd6. Cross-run matching: a license seen in a previous run matches its previous business by the license identity `(source_id, license_type, license_number)` first; dedupe only decides the business for NEW licenses. |
| **Failure mode** | Dedupe never fails a run by itself. Ambiguity is a normal outcome (held clusters), reported in the dry-run report with counts. |

### Stage 5 — Load

| | |
|---|---|
| **Input** | `NormalizedRecord[]` + dedupe assignments + run context `{ run_id, source_id, contract_version }` |
| **Output** | `LoadReport { loaded, new, changed, disappeared, unchanged, parse_errors, conflicts, anomalies }` + updated `ingestion_runs` row |
| **Interface** | Loader `load(run_context, records)` — guarantees L1–L8 (`data-contract.md` §4) |
| **Rules** | L1. Schema validation first (already done in Stage 3 — re-check at the loader boundary; defense in depth). L2. Idempotency: same SHA-256 twice = no change (unique index + upsert key). L3. Upsert by `(source_id, license_type, license_number)`; never delete a row. L4. `license_status_history` row appended exactly on status/verification change, on initial load, and on disappearance/reappearance — never for unchanged records. L5. Disappeared rows: present last run, absent now → `disappeared_from_source=true`, `disappeared_at=now()`, history row `change_reason='disappeared_from_source'`. Reappeared rows: clear the flag + history row `reappeared_in_source`. L6. Conflicts: two sources disagree → both values to `source_conflicts` (`status='open'`), license row keeps its previous value. L7. One transaction per run; any failure rolls the whole run back and marks it `failed`. L8. Run row + every license row carry `contract_version`; unknown versions rejected before any write. L9. Holder handling: find-or-create `license_holders` by exact `full_name` match within the run (no fuzzy matching in Sprint 01). L10. Location handling: find-or-create `locations` rows (county-level when city is NULL). L11. Business-name fallback: when the normalized record has `business_name: null`, `businesses.name` falls back to the holder's `full_name` — and the fallback is recorded in `audit_logs` (`action='business.name_fallback'`) so it is visible, not hidden. |
| **Failure mode** | Any DB error, constraint violation, or unknown contract version → whole run rolls back, run row `failed` with `error_message`. Publication is NEVER part of loading (gates are a separate step). |

### Stage 6 — Verify (post-load checks + anomaly gate)

| | |
|---|---|
| **Input** | `LoadReport` + previous run's counts + the loaded rows |
| **Output** | Anomaly verdict (`pass` / `blocked_anomaly`) + verification report; on pass, the run row is marked `succeeded` with final counts |
| **Interface** | `verify(run_context, report)` — the last stage before publication is even considered |
| **Rules** | V1. **Anomaly check BEFORE any publication (US5):** row count jumps >10% vs the previous successful run for the same source → `blocked_anomaly`; a required column missing → already failed at parse; a field-format break (e.g. dates suddenly unparseable in >1% of rows) → `blocked_anomaly`; duplicate license identity within one file → `blocked_anomaly`. On `blocked_anomaly`: NOTHING is published, the run row records the reason, and a human reviews. (Note: the load itself may already have happened in the same transaction — the gate blocks PUBLICATION, and the run is flagged so the next run's comparison uses the last GOOD run, not the anomalous one. The implementer must record which run is "last good" per source; see §8 open item O-2.) V2. **Reconciliation counts:** loaded vs parsed vs downloaded; new/changed/disappeared/unchanged must sum to `row_count_loaded` + disappeared; any mismatch fails verification. V3. **Spot re-read:** read back a sample of loaded rows and compare field-by-field with the normalized records (the dry-run cross-check in T024 is the formal version of this; the stage runs a small automatic sample every run). V4. **No publication from this stage:** Stage 6 only verifies. Publication (setting gate timestamps + creating `publication_batches` / `publication_batch_items`) is a separate, human-approved step (Sprint 03+), never automatic. |
| **Failure mode** | Anomaly → run `blocked_anomaly`, no publication, human review. Verification mismatch → run `failed`. |

## 3. Idempotency

- **Same file twice:** detected by `(source_id, sha256_checksum)` (Stage 1,
  D5) → no-op run, no duplicate rows, no new history rows.
- **Same run re-executed after a crash:** the run row is left `running`; the
  next execution for the same source either resumes by checksum (if the file
  is unchanged, the no-op path applies) or starts a new run row. A `running`
  row older than the configured stale threshold (default 24 h) is marked
  `failed` ("stale — superseded") by the next run, never deleted.
- **Same records, new file:** upsert by identity (L3); unchanged records
  produce no history rows (L4) and no `audit_logs` noise.
- **Re-running the migrations:** all migrations are idempotent (verified by
  re-execution against real Postgres 16.15 on 25/11/2026 — see
  `data-model.md` §9).

## 4. Anomaly detection

Thresholds (defaults; configurable per source in §6 config — a threshold
change is a config change, not a code change):

| Check | Threshold (default) | Action |
|---|---|---|
| Row count vs previous successful run | change > 10% (up or down) | `blocked_anomaly` |
| Parse errors | > 1% of rows, or any header error | run `failed` (Stage 2) |
| Unparseable dates | > 1% of rows | `blocked_anomaly` |
| Duplicate license identity within one file | any (> 0) | `blocked_anomaly` |
| Missing required column / renamed header | any | run `failed` (Stage 2) |
| Expired-share jump (expired % changes by > 10 points vs previous run) | > 10 points | `blocked_anomaly` (a sudden jump usually means a date-format break, not a real expiry wave) |
| Source file empty (0 data rows) | any | run `failed` |

Every anomaly records: the check name, the observed value, the threshold, the
previous-run value, and the run id — in `ingestion_runs.notes` (structured
text) and in the dry-run report. Anomalies never auto-resolve: a human clears
them.

## 5. Rollback & backup

**Rollback (US5):**
- **Run-level rollback:** a run's load is one transaction (L7). A failed run
  leaves the DB exactly as before the run. No manual step needed.
- **Batch-level rollback (publication):** reverting a `publication_batches`
  row clears `data_published_at` / `seo_index_published_at` ONLY on rows
  listed in `publication_batch_items` for that batch+gate, sets the batch
  `status='rolled_back'`, `rolled_back_at=now()`, and records
  `rolled_back_to_batch_id` (the prior batch restored). The license/business
  rows themselves are never deleted by a rollback.
- **What rollback is NOT:** there is no "restore the DB to last Tuesday"
  button in Sprint 01. Rollback = (a) transaction atomicity for runs,
  (b) batch revert for publication. Full point-in-time recovery depends on
  the backup below + Supabase Pro backups in production (a commercial
  decision, outside Sprint 01).

**Backup (US5):**
- The ETL must export the loaded data on a schedule (default: after every
  successful run, or at least daily): a full export of all 14 tables in a
  restorable format (PostgreSQL `pg_dump` custom format for the local/Supabase
  DB, or CSV per table — the implementer picks ONE and documents it).
- **Export/restore must be TESTED, not just documented:** the dry-run restores
  the export into a scratch database and compares row counts per table
  (T022 tests). An untested backup is not a backup.
- Supabase Free has no automatic backups — the export is the backup for the
  experiment phase. Before production, the Owner decides on Supabase Pro
  (daily backups, 7-day retention) — see spec v2 §2.

## 6. Config-driven design (no hardcoding)

The engine is configured per source / state / trade. **No House Craft Pros
value is hardcoded in engine logic.** Concretely:

```text
config/
  sources.yaml          # one entry per source: code, agency, trade, file_name,
                        #   download URL(s), expected headers, license-type label,
                        #   has_status_field, file-date rule, retry/timeout
  states.yaml           # one entry per state: state_code, sources enabled,
                        #   thin-page rule parameters (see below)
  trades.yaml           # one entry per trade: trade key, license-type labels,
                        #   subtype values, endorsement columns
  thresholds.yaml       # anomaly thresholds per source (see §4)
```

Rules for the implementer:
- C1. A string literal naming a Texas source, a Texas county, a House Craft
  Pros URL, or a trade label inside engine code (not config) is a BUG. The
  engine reads those from config.
- C2. Adding a state (e.g. California) = adding config entries + a source
  adapter for the new source format — never editing stage logic.
- C3. The thin-page rule parameters (which fields a profile needs to be
  indexable) live in config per trade, because they differ by trade
  (electrical/plumbing need phone-or-address; HVAC needs county). The RULE
  (a profile is indexable only if it meets its trade's parameters AND GATE 2
  is open) lives in code and is the same for every trade.
- C4. Config files are versioned in the repo (they contain no secrets, no
  PII, no URLs with credentials). Secrets (if any are ever needed) come from
  environment variables, never from config files.
- C5. The engine logs the config version (git commit or config checksum) in
  every `ingestion_runs.notes`, so a run is reproducible from (config version
  + source checksum).

## 7. Reuse points for the Bee ecosystem (design for reuse — STOP here)

This section exists because the Owner directed the Data Ingestion Engine to be
reusable for other Bee-ecosystem sites. It lists the reuse points the design
already provides. **That is all it does: no Bee Core Engine is built in this
sprint, no shared service, no microservices, no cross-site code is written.**
Sprint 01 delivers a reusable engine design + a working Texas implementation;
extracting a shared library/service is a later, separately approved decision.

| Reuse point | How it works | What a second site reuses unchanged |
|---|---|---|
| Config-driven sources/states/trades (§6) | New site = new config entries, not new engine code | The whole stage pipeline (download → verify) |
| Source adapter interface (`data-contract.md` §3) | One adapter per government source format; adapters are small, single-purpose, and carry no House Craft Pros logic | The interface + the loader + the stage contracts |
| Normalized record schema (`etl/contract/`) | Language-independent JSON Schema; versioned (`contract_version` on every record and run) | The schema file + the versioning rules; a second site starts from v1 and extends it by minor version (new `source_code` values) |
| Loader guarantees L1–L8 | Idempotency, history-on-change, disappeared-not-deleted, conflict recording, per-run transactions | The loader logic (parameterized by config + schema version) |
| DB schema (migrations) | 14 tables; the 11 spec tables are generic (businesses, licenses, history, claims, corrections, batches, audit); only `data_sources` seed rows and the trade enum values are Texas-specific | The migrations (new site adds its own seed migration) |
| Two-gate publication | Data gate vs SEO-index gate is a generic pattern for any directory that must not publish thin/low-trust pages to search engines | The gate columns + `publication_batches` / `publication_batch_items` pattern |
| Split status vs confidence | `license_status` / `verification_level` is generic to ANY government-license data (the "inferred vs confirmed" problem is not Texas-specific) | The columns + the CHECK constraint pattern + the JSON Schema `if/then` |
| Anomaly / rollback / backup (§4–§5) | Thresholds in config; rollback by batch membership; export/restore tested | The stage-6 checks + the rollback procedure |

What is deliberately NOT reusable yet (and why): the Next.js frontend
(house-specific SEO/pages), the thin-page rule VALUES (trade-specific, live in
config), the dedupe evidence rules (D1–D2 are tuned to these three CSVs; a new
source may need different evidence — the dedupe stage is config-extensible
but its Texas rules are not silently assumed for other sources).

## 8. Open items

- **[NEEDS CLARIFICATION] NC-1** — Exact TDLR licfile.asp download URL for
  `Lteecele.csv` / `ltairref.csv`. Not in the research files; the seed
  migration records the TDLR home page and does NOT guess. **Question for the
  implementer (Worker C):** confirm the exact URL at implementation time from
  the live `licfile.asp` page (or the Nov-24 download method, if documented
  anywhere in `~/workspace/trades-directory/research/`), record it in
  `ingestion_runs.source_url` on the first successful run, and update the
  seed + `data-contract.md` if the URL is stable.
- **[NEEDS CLARIFICATION] NC-2** — Exact TSBPE RMP download URL/format.
  Landing page verified: `https://tsbpe.texas.gov/free-licensee-list/`.
  **Question:** does the page expose a direct CSV link? If not, record the
  fallback method used and its as-of date in the run notes (do not guess a
  URL).
- **O-1 — TDLR `COUNTY` vs `BUSINESS COUNTY`.** v1 uses `BUSINESS COUNTY`
  only; the licensee `COUNTY` column is ignored. If the dry-run shows the two
  disagree materially, the implementer reports it (do not silently switch).
- **O-2 — "Last good run" pointer.** Stage 6 compares against the previous
  SUCCESSFUL run, not the previous run (an anomalous run must not become the
  baseline). The implementer must define where this pointer lives (a column
  on `data_sources`, e.g. `last_good_run_id`, added by a later migration, or
  a query for the latest `succeeded` run — the query is simpler and is the
  default; document the choice).
- **O-3 — Stale `running` rows.** Default stale threshold is 24 h (see §3).
  If the Owner wants a different threshold, it is a config value, not a code
  change.
- **O-4 — Export format.** The implementer picks ONE backup export format
  (§5) and documents it in `etl/README.md`; the choice must support a tested
  restore with per-table row-count comparison.
- **Known gap (QA finding F5, 25/11/2026) — cross-source business reuse has no
  decision row.** The loader's cross-source business reuse (same name +
  phone/address evidence, `etl/src/sqlgen.ts`) merged 58 businesses in the
  dry-run, but those merges leave no `dedupe_decisions` row — only the 78
  in-run `merged` decisions carry a `business_id`. The 58 are detectable
  post-hoc (businesses with licenses from more than one source) but are not
  individually traceable as decisions. Follow-up (Sprint 02): log each reuse
  as a `dedupe_decisions` row (decision `merged`, rationale
  `cross-source reuse`) or an audit-log entry. Until then, do not present the
  58 as individually reviewed merges. Also recorded as risk R-10 in
  `docs/reports/sprint-01-dry-run.md` §11.
