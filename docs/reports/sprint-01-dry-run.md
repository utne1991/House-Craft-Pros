# Sprint 01 dry-run report — Data Foundation

**Date:** 25/11/2026 · **Worker C — ETL Engine + Dry-Run** · **Status: FINAL — coordinator-reviewed 25/11/2026 after independent QA (Worker D).**
QA findings F1–F4 fixed in this issue (medians, evidence paths, phone counts,
held-cluster wording — each marked inline); F5 recorded as a known gap (R-10);
F6 noted. QA report: `docs/reports/sprint-01-qa.md`. All numbers below were
recomputed by the coordinator from the primary sources (DB, summary.json files,
staging CSVs) while applying the fixes.

## 1. Work completed / not completed

### Completed

| Task | What was done |
|---|---|
| T020 — Fresh downloads | All 3 sources downloaded fresh on 25/11/2026 (see §2). NC-1 and NC-2 resolved with exact URLs + as-of dates. No fallback to the Nov-24 local copies was needed. |
| T021 — ETL implementation | `etl/` in TypeScript, zero dependencies, Node 24, stages download → parse → normalize → dedupe → load → verify. Loads into real PostgreSQL via generated SQL/COPY + local `psql`. Open items O-1–O-4 resolved (see §9). |
| T022 — Tests | 68/68 pass (50 unit + 11 contract + 7 DB). See §8. |
| T023 — Full dry-run | End-to-end into real Postgres `housecraftpros`. See §3–§5. |
| T024 — Cross-check | 100/100 sampled licenses pass field-by-field vs source CSVs; Socrata reconciliation done. See §6. |
| T027 — Contract tests | 11/11 pass, incl. version-bump tests. See §8. |
| T025/T028 — Rust readiness | Benchmark COMPLETE (not pending). See §7 and `docs/architecture/rust-readiness.md`. |
| T026 — Docs | `etl/README.md` + `etl/package.json` written. This report is the draft deliverable. |

### Not completed / out of scope for this sprint

- **First live ETL load** — this was a dry-run only. The database used is the
  local VM Postgres (`housecraftpros`); the first live load needs Owner /
  anh Út approval of these numbers (repo AGENTS.md §4).
- **No production deploy, no merge to main, no GitHub operations** — per the
  task. All work is local files under the repo working tree.
- **Rust DB write speed was not measured** — the Rust harness has no loader
  (no Rust engine in this sprint). Stated honestly in §7; no number is
  claimed for it.
- **Human review of the 1,355 held ambiguous clusters** — the ETL holds them
  by design; a human-review workflow is a later step, not part of Sprint 01.

## 2. License counts per source (as-of dates + checksums)

Downloads: 25/11/2026 ~02:54 CST (08:54 UTC). Staging: `/tmp/hcp-etl/staging/`
(raw CSVs stay OUT of the repo — they contain real licensee phones).

| Source | URL | File date | Rows (excl. header) | SHA-256 |
|---|---|---|---|---|
| TDLR electrical (`Lteecele.csv`) | https://www.tdlr.texas.gov/dbproduction2/Lteecele.csv | 2026-11-24 (HTTP Last-Modified 24 Nov 2026 12:17:53 GMT) | 14,066 | `071b46b1d0c0e806b0d3a56f74c4428d67b067e167c3ba7834cd00373d1048fb` |
| TDLR HVAC (`ltairref.csv`) | https://www.tdlr.texas.gov/dbproduction2/ltairref.csv | 2026-11-24 | 20,498 | `fb6328474ea47102f6b3130e87d6a4141bb17e56ca69a1fb09dc423cc448b03c` |
| TSBPE RMP (`rmp_download`) | https://tsbpe.texas.gov/download-csv/RMP/ | none in file (file_date NULL; status_as_of = run date 2026-11-25) | 9,412 | `6308c0e2b540b38a4c844b518e35690f91daef483f4fb936f4eed69898740948` |
| **Total** | | | **43,976** | |

- **NC-1 resolved:** the live licfile page is
  `https://www.tdlr.texas.gov/licenseSearch/licfile.asp` (HTTP 200; the bare
  `/licfile.asp` path is 404). It exposes relative links
  `../dbproduction2/Lteecele.csv` and `../dbproduction2/ltairref.csv`;
  direct download works.
- **NC-2 resolved:** the TSBPE landing page
  `https://tsbpe.texas.gov/free-licensee-list/` returned 403 via curl, but
  the saved Nov-24 page exposes `https://tsbpe.texas.gov/download-csv/RMP/`,
  which returned HTTP 200 `text/csv` and downloaded successfully.
- Fresh files **differ** from the Nov-24 local copies (different checksums;
  electrical 14,066 vs 14,067 lines incl. header; HVAC 20,498 vs 20,497;
  RMP 9,412 vs 9,416) — the sources change daily, which is why the fresh
  download matters.
- No duplicate license numbers within any file. No parse errors in any file.
- All three runs in `ingestion_runs` are `succeeded`, 14,066 / 20,498 /
  9,412 downloaded = parsed = loaded, 0 changed, 0 disappeared (first load).

## 3. Businesses after dedupe (+ ambiguous clusters held back)

| | Count |
|---|---|
| Licenses loaded | 43,976 |
| Businesses in DB | **43,837** |
| Holders | 43,514 |
| Locations | 2,441 |
| History rows (all `initial_load`) | 43,976 |
| Dedupe decisions recorded | 1,433 |

Businesses by dedupe status: `single` 40,625 · `merged` 134 ·
`ambiguous_held` 3,078.

Dedupe decisions: **78 merged** · **994 `held_ambiguous`** (same name only,
no shared phone/address evidence) · **361 `rejected_no_merge`** (same name
but conflicting evidence). **1,355 clusters held back in total, covering
3,099 license IDs** — held for human review, never auto-merged. Of those
3,099 IDs, 3,078 sit in `ambiguous_held` businesses and 21 in `merged`
businesses (attached via loader cross-source reuse). The `ambiguous_held`
businesses hold 3,079 licenses in total — one such business carries 2
licenses (the second attached via cross-source reuse). (Wording corrected
25/11/2026 after QA finding F4; an earlier draft wrote "3,079 licenses" for
the 1,355 clusters.)

Per source (businesses / merged / held):

| Source | Licenses | Businesses | Merged | Held |
|---|---|---|---|---|
| Electrical | 14,066 | 14,037 | 29 | 256 |
| HVAC | 20,498 | 20,498 | 0 | 774 |
| Plumbing (RMP) | 9,412 | 9,360 | 49 | 325 |

Note on the count: the in-run dedupe partitions 43,976 licenses into
43,895 businesses; the loader's cross-source business reuse (same
name+phone/address evidence rule) merges a further 58, giving 43,837 in
the DB. Both bench sides agree on 43,895, so this is a loader behaviour,
not a discrepancy.

## 4. Expired + missing-data licenses

### Status (license_status / verification_level)

| | Active | Expired | Unknown |
|---|---|---|---|
| Total | 40,190 | 3,786 | 0 |
| authority-confirmed (TSBPE source status) | 8,742 | 670 | 0 |
| inferred (TDLR, from expiration date) | 31,448 | 3,116 | 0 |

Expired per source: electrical 1,731 · HVAC 1,385 · RMP 670.
Active per source: electrical 12,335 · HVAC 19,113 · RMP 8,742.
No license is labelled "Verified": TDLR status is `inferred` by design.

### Missing data

| Gap | Count |
|---|---|
| HVAC phone + address missing (100% of HVAC — by source design; the file has no phone/address fields) | 20,498 |
| RMP no phone | 4,694 |
| RMP no address | 4,606 |
| Electrical no phone | 6 |
| Electrical no address | 17 |
| Licenses with no county | 832 |
| Businesses whose name fell back to the holder name (recorded in `audit_logs`, `business.name_fallback`) | 435 |

Counting rule for the phone/address cells (corrected after QA finding F3):
counts are **business-level** — a license counts as having a phone if its
business has one. Record-level CSV counts: electrical empty phone 6 (same
under both rules — the earlier "7" was wrong under both); RMP empty phone
4,695 at record level vs 4,694 business-level (one RMP license has no phone
on its own CSV row but sits in a business that got a phone from a sibling
license).

## 5. Profiles with publishable contact info

Thin-page rule: electrical/plumbing need phone **or** address; HVAC needs
county (it has no phone/address by source design).

| Source | Publishable | Of |
|---|---|---|
| Electrical | 14,062 | 14,066 |
| HVAC | 19,705 | 20,498 |
| Plumbing | 4,806 | 9,412 |
| **Total** | **38,573** | **43,976 (87.7%)** |

## 6. Database size (measured from Postgres)

| | Size |
|---|---|
| Empty schema (after migrations, before load) | 8,711 kB |
| After full dry-run load | **82,181,143 bytes (78 MB)** |

`SELECT pg_database_size(current_database())` on `housecraftpros`
(PostgreSQL 16.15). 14 tables. Backup: `pg_dump -Fc` dump 11.2 MB at
`/tmp/hcp-etl/backup/housecraftpros-2026-11-25.dump`; restore tested into
`housecraftpros_restore` — **14/14 tables match**, restored DB 61 MB.

## 7. Cross-check results (100 samples)

**100/100 PASS** — stratified sample across trade × status, each license
compared field-by-field (license number/type/subtype, dates, status,
verification, status source, holder, business name/phone/address/county,
endorsements, insurance) against its re-parsed source CSV row.

| Stratum | Pass | Fail |
|---|---|---|
| electrical / active | 28 | 0 |
| electrical / expired | 8 | 0 |
| hvac / active | 28 | 0 |
| hvac / expired | 8 | 0 |
| plumbing / active | 20 | 0 |
| plumbing / expired | 8 | 0 |
| **Total** | **100** | **0** |

Evidence (pass/fail booleans + license numbers only, no PII):
`etl/evidence/crosscheck-2026-11-25.json`. One fix made during the
cross-check: business `address_state` is compared against the load-time
`'TX'` default, not the record's NULL.

### Socrata reconciliation (dataset `7358-krk7`, total 976,150 rows)

| Source | Socrata count | CSV count | Difference |
|---|---|---|---|
| Electrical Contractor | 14,071 | 14,066 | Socrata +5 |
| A/C Contractor | 20,480 | 20,498 | CSV +18 |

Socrata has only 9 fields (no phone/address/city/status) — counts only,
never a directory source. The discrepancy is a snapshot/cadence
difference (daily files vs Socrata refresh), not an error in either side.

## 8. Test results

**68/68 PASS** (`npm test` — `node --test` with the explicit file list;
the `node --test tests/` directory form fails on Node 24).

| Suite | Tests | Result | Coverage |
|---|---|---|---|
| Unit (`tests/csv.test.ts`, `tests/normalize.test.ts`, `tests/validate-dedupe-anomaly.test.ts`) | 50 | 50 pass | CSV parser (BOM/CRLF/quoted fields), TDLR + RMP normalization, status/verification split, dedupe rules incl. split clusters, anomaly thresholds, L1/L8 validation, invariant I1 |
| Contract (`tests/contract.test.ts`) | 11 | 11 pass | Sample records validate against `contract/normalized-record.v1.json` (Python `jsonschema` is the validation oracle); missing fields fail; I1 enforced; bad checksum fails; unknown field fails; v2 record fails v1 schema; old v1 records validate against v1.1; new optional-field record validates against v1.1 but not v1; loader rejects unknown versions |
| DB (`tests/db.test.ts`) | 7 | 7 pass | Real Postgres scratch DB (`housecraftpros_test`, created from the real migrations, loaded via the real driver) with 21-row RMP fixtures v1/v2: idempotency, disappeared handling, status change, unchanged-record no-history, rollback atomicity, backup/restore, round-trip |

Plus: **post-load verify 12/12 PASS** (`node src/verify.ts`);
**backup/restore 14/14 tables match** (`node src/backup.ts`).
**Idempotency verified live:** re-running RMP with the same file returns
`duplicate_noop` and loads nothing.

## 9. Open items resolved (etl-pipeline.md §8)

- **O-1 — TDLR `COUNTY` vs `BUSINESS COUNTY`:** they disagree materially
  (electrical 908/14,066 = 6.46%; HVAC 4,977/20,498 = 24.28%). Per
  contract v1 only `BUSINESS COUNTY` is used; the disagreement is
  reported here, the rule was not switched silently.
- **O-2 — "last good run" pointer:** query the latest `succeeded` run per
  source; no pointer column added.
- **O-3 — stale-`running` threshold:** 24 h (in `etl/config/sources.json`).
- **O-4 — backup export format:** PostgreSQL `pg_dump` custom format
  (`-Fc`); CSV-per-table rejected (loses schema and FK order). Restore
  tested (§6).

Two further behaviours documented in `etl/README.md` because the pipeline
doc's literal wording could not be followed: a duplicate re-run reports
`duplicate_noop` without creating a new run row (the UNIQUE
`(source_id, sha256_checksum)` index makes a second run row impossible);
a retry after a failed run reuses the same run row id.

## 10. Rust-readiness summary

Benchmark **COMPLETE** — see `docs/architecture/rust-readiness.md` and
`etl/bench/results-2026-11-25.md`. Same files (same SHA-256), same machine
(4 CPUs, 7,934 MB RAM, Linux 7.0.0-44-generic x86_64), same rules, same
output schema; parse + normalize + dedupe only; 3 runs per side, **medians**
(middle value of the 3 runs — corrected 25/11/2026 after QA finding F1; an
earlier draft reported the minimum of the 3 runs as the "median").

| Metric (median) | TypeScript (Node 24.22.1) | Rust 1.100.0 (release) |
|---|---|---|
| Wall time | **2,715 ms** | 3,227 ms |
| User CPU | 2,900.8 ms | 3,020.0 ms |
| System CPU | 484.3 ms | 180.0 ms |
| Peak RSS | 708 MB | **196 MB** |

**Output accuracy: all three canonical outputs byte-identical**
(`records.jsonl` 43,976 rows, `businesses.json` 43,895, `dedupe.json`
78 merged + 1,355 held) — zero unexplained deltas. One delta was found
and fixed during the run: city `"GRAND  PRAIRIE"` (double space in the
source) — TS preserves the source spelling, the first Rust version
collapsed it; Rust was fixed to preserve it.

**DB write speed: TypeScript-only** (RMP ~6 s, electrical ~9 s, HVAC
~10 s end-to-end per source, incl. ~2 s download). Rust DB write was NOT
measured — the harness has no loader; no number is claimed for it.

**Recommendation: stay on TypeScript.** At ~44k licenses TS is faster on
wall time and the whole load is seconds; Rust's advantage is memory
(3.6× less), not speed. Re-benchmark if volume grows ~10–100×, if a
memory-constrained runner is used, or if a Rust loader is ever built and
measured.

## 11. Remaining errors and risks

| # | Item | Risk / note |
|---|---|---|
| R-1 | **1,355 ambiguous clusters (3,099 license IDs) held** | By design (conservative dedupe). Of the 3,099 IDs, 3,078 sit in `ambiguous_held` businesses and 21 in `merged` businesses (loader cross-source reuse). They must not be presented as merged businesses until a human reviews them. A human-review workflow is not built yet. |
| R-2 | **HVAC has no phone/address in the source (100%)** | 793 HVAC licenses have no county either, so they fail even the thin-page rule (19,705/20,498 publishable). Nothing to fix in the ETL — the source file simply lacks those fields. |
| R-3 | **RMP: 4,694 no phone (business-level; 4,695 at record level), 4,606 no address** | Only 4,806/9,412 plumbing licenses have publishable contact. Same as R-2: source limitation, not an ETL defect. |
| R-4 | **O-1 county disagreement (6.46% elec, 24.28% HVAC)** | `BUSINESS COUNTY` is used per contract v1. If the county is ever wrong for a license, this is the first place to look. |
| R-5 | **Socrata counts differ by +5 / −18** | Snapshot/cadence difference, not an error. If a future reconciliation shows a large gap (>1%), investigate before loading. |
| R-6 | **TSBPE landing page returns 403 via curl** | The direct CSV URL works today, but if TSBPE changes its download path the ETL download will fail and fall back to a local file (as-of date must then be stated plainly). (QA note 25/11: a later curl returned 200 for the landing page — the 403 was transient/WAF behaviour; the material claim, that the direct CSV URL works, is unaffected.) |
| R-10 | **Cross-source business reuse (58 merges) leaves no `dedupe_decisions` row** (QA finding F5, known gap) | The 58 loader reuse merges are detectable post-hoc (businesses with licenses from >1 source: exactly 58, verified by QA) but are not recorded as decisions — only the 78 in-run `merged` decisions carry a `business_id`. Follow-up (Sprint 02): log each reuse as a `dedupe_decisions` row (decision `merged`, rationale `cross-source reuse`) or an audit-log entry, so every business merge is traceable; also recorded in `etl-pipeline.md` §8. Until then, do not present the 58 as individually reviewed merges. |
| R-7 | **No staging environment; dry-run DB is the local VM Postgres** | The numbers above are from the VM database, not Supabase. The first live load needs Owner/anh Út approval and a Supabase target. |
| R-8 | **TS bench RSS 708 MB** | Node holds all records + canonical JSON in memory. Fine at 44k rows; if volume grows 10×, stream the JSONL output or re-run the Rust benchmark (§10). |
| R-9 | **Duplicate re-run is a no-op, not a new `succeeded` run** | Documented behaviour (see §9); anyone reading pipeline doc §D5 literally will expect a new run row. The README states the actual behaviour. |

## 12. Execution evidence (commands run + outputs summarized)

Environment: PostgreSQL 16.15 (cluster `16 main`, port 5432), Node
v24.22.1, Python 3.12.3 (`jsonschema` 4.10.3), Rust 1.100.0 (rustup,
25/11/2026), 4 CPUs, ~7.9 GB RAM, Linux 7.0.0-44-generic x86_64. Run as
root on the VM.

| Step | Command (from `etl/`) | Output |
|---|---|---|
| Fresh downloads | `node src/run.ts --all` (download stage) + `curl` checks of licfile.asp / TSBPE pages | 14,066 / 20,498 / 9,412 rows; checksums in §2 |
| Full load | `node src/run.ts --all` | 3 succeeded runs; 43,976 licenses; 43,837 businesses; DB 78 MB |
| Post-load checks | `node src/verify.ts` | 12/12 PASS |
| Cross-check | `node src/crosscheck.ts` | 100/100 PASS; evidence `etl/evidence/crosscheck-2026-11-25.json` |
| Backup | `node src/backup.ts` | dump 11.2 MB; restore 14/14 tables match |
| Tests | `npm test` | 68/68 PASS (50 unit + 11 contract + 7 DB) |
| Idempotency | re-run RMP with the same file | `duplicate_noop`, nothing loaded |
| Socrata | `python3 research/tdlr_counts.py` pattern (dataset `7358-krk7`) | elec 14,071 (+5), HVAC 20,480 (−18) |
| Benchmark | `bash bench/run-bench.sh` | 3 runs/side; outputs byte-identical; TS 2,715 ms / Rust 3,227 ms median wall |

Key files (all local, no GitHub operations):

- `etl/src/` — `run.ts`, `csv.ts`, `normalize.ts`, `validate.ts`,
  `dedupe.ts`, `anomaly.ts`, `pg.ts`, `sqlgen.ts`, `verify.ts`,
  `backup.ts`, `crosscheck.ts` (2,600+ lines total)
- `etl/config/sources.json`, `etl/contract/normalized-record.v1.json`,
  `etl/package.json`, `etl/README.md`
- `etl/tests/` — 5 test files + fixtures (`rmp-v1.csv`, `rmp-v2.csv`,
  `normalized-record.v1.1.json`, `validate_schema.py`)
- `etl/evidence/crosscheck-2026-11-25.json`
- `etl/bench/` — `ts-bench.ts`, `rust-harness/src/main.rs` + `Cargo.toml`
  (+ `Cargo.lock`), `run-bench.sh`, `README.md`,
  `results-2026-11-25.md`
- `docs/architecture/rust-readiness.md`, this report
  (`docs/reports/sprint-01-dry-run.md`), `.gitignore` (bench outputs,
  `target/`, dumps, TSVs, CSVs except test fixtures — PII must never be
  committed)

Staging/evidence outside the repo (not committed, contains real PII):
`/tmp/hcp-etl/` (CSVs, `run.sql` + TSVs, `run-summary.json`, backup dump),
`/tmp/hcp-bench-out/` (benchmark canonical outputs + summaries).

## 13. Correction note — commit fb434496 (Sprint 00)

Commit `fb434496` was reported as "16 files" but GitHub recorded only
**5 changed files** — `README.md`,
`docs/danh-gia-thiet-ke-2026-11-25.md`, `docs/dinh-huong-2026-11-24.md`,
`docs/spec-mvp-texas-v2.md`, `docs/spec-mvp-texas.md` — because the other
11 manifest paths were byte-identical to HEAD. The "16 file" claim was
wrong; the "5 file" observation was correct. (Recorded in repo
`AGENTS.md` §7; restated here as the task required.)
