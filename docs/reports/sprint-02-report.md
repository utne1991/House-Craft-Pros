# Sprint 02 report — License Verification Tool

**Date:** 25/11/2026 · **Branch:** `sprint-02/lookup-and-review` ·
**Status:** work complete, PR prepared for acceptance (no merge, no deploy).
**Worker:** Sprint 02 continuation (Owner approved on Muse Dashboard
25/11 ~10:34: (1) process the already-cloned repo content, (2) reinstall
Postgres 16 + rebuild the local DB).

Environment: Ubuntu 24.04.5 LTS, PostgreSQL **16.15** (Ubuntu
`noble-updates`, cluster `16 main`, port 5432), Node v24.22.1, Python
3.12.3, run as root on the VM. Same versions as Sprint 01.

## 1. Work completed / not completed

### Completed

| Task | What was done |
|---|---|
| T1 — Postgres + rebuild | Postgres 16.15 installed + started; DB `housecraftpros` recreated; migrations 0001–0006 applied 6/6; fresh downloads 25/11 → full load (§2) |
| T2 — ADR flips | ADR-0001…0004 → `accepted (25/11/2026)`, basis recorded in each file |
| T3 — F5 / R-10 | Every cross-source reuse merge is now logged as a `dedupe_decisions` row (§3); two new DB tests; two further loader bugs fixed (§4) |
| T4 — Review workflow | `review.ts` + `review-cli.ts` built + tested (7 tests); live queue measured: 965 clusters / 2,348 licenses (§5) |
| T5 — License lookup | `lookup.ts` + `lookup-cli.ts` (read-only) + `/verify/` contract (§6); 7 tests; smoke-tested on the rebuilt DB |
| T6 — Contractor Records profile | Previous coordinator's deep profile added to `research/` (§7) |
| Tests | **84/84 pass** (`npm test` — 68 Sprint 01 + 16 new) |

### Not completed / out of scope

- **First live ETL load** — still needs Owner / anh Út approval of the
  dry-run numbers (AGENTS.md §4). The rebuilt DB is local-only.
- **Human review of the 965 held clusters** — the workflow is built; the
  decisions belong to a human reviewer, not to this sprint.
- **No push / PR / merge / deploy** — per AGENTS.md §6 the worker never
  touches GitHub; the branch is ready for the parent agent.
- **No Next.js app / HTTP server** — the `/verify/` route is Sprint 03.

## 2. Rebuild (T1) — fresh downloads 25/11/2026

Staging: `/tmp/hcp-etl/` (CSVs, `run.sql` + TSVs, `run-summary.json`).
Raw CSVs stay OUT of the repo.

| Source | URL | File date | Rows (excl. header) | SHA-256 |
|---|---|---|---|---|
| TDLR electrical (`Lteecele.csv`) | https://www.tdlr.texas.gov/dbproduction2/Lteecele.csv | 2026-11-25 | 14,067 | `4095be33ef365417d1b17fc5906fbf635eed948b6b56688ea6b3971c90bcec90` |
| TDLR HVAC (`ltairref.csv`) | https://www.tdlr.texas.gov/dbproduction2/ltairref.csv | 2026-11-25 | 20,500 | `6bdb2742398134d8ba6829dd112636efe52b7e3ad9807620b1d81ce291817881` |
| TSBPE RMP (`rmp_download`) | https://tsbpe.texas.gov/download-csv/RMP/ | none in file (file_date NULL; status_as_of = run date 2026-11-25) | 9,413 | `d941d64cbc4c2f93bcdfe4c7d0e8951a7e31048a52872b1606f9249872e920c6` |
| **Total** | | | **43,980** | |

Run IDs: electrical `3fc3262c-3dcc-4b72-aa72-ab58f430899a`, HVAC
`d6e16036-fe6c-4d81-bd9d-e9a76f90468f`, RMP
`b5959187-26f9-4f50-9bae-151c3ddaa83a`. All 3 runs `succeeded`,
downloaded = parsed = loaded, 0 parse errors, reconciliation OK.

### Rebuild vs Sprint 01 baseline (fresh files 25/11 ~02:54 CST)

| Metric | Sprint 01 | Sprint 02 rebuild | Δ | Note |
|---|---|---|---|---|
| Licenses | 43,976 | **43,980** | +4 | Daily source churn (elec +1, HVAC +2, RMP +1) |
| Businesses | 43,837 | **43,840** | +3 | |
| Holders | 43,514 | 43,518 | +4 | |
| Locations | 2,441 | 2,443 | +2 | |
| History rows | 43,976 | 43,980 | +4 | All `initial_load` |
| Dedupe decisions | 1,433 | 1,491 | +58 | 57 reuse rows (§3) + 1 more in-run merged |
| Merged decisions | 78 | 136 | +58 | 79 in-run + 57 reuse |
| Held (`held_ambiguous`) | 994 | 994 | 0 | |
| Rejected (`rejected_no_merge`) | 361 | 361 | 0 | |
| Active / Expired | 40,190 / 3,786 | **40,209 / 3,771** | +19 / −15 | |
| authority-confirmed / inferred | 9,412 / 34,564 | 9,413 / 34,567 | +1 / +3 | |
| Businesses single / merged / held | 40,625 / 134 / 3,078 | 40,627 / 135 / 3,078 | +2 / +1 / 0 | |
| Orphan businesses | not measured | **0** | — | New check (§4) |
| DB size | 82,181,143 B (78 MB) | **86,031,383 B (82 MB)** | +3.8 MB | 57 extra decision rows + 4 licenses + index growth |
| Publishable contact (thin-page rule) | 38,573 (87.7%) | **38,577 (87.7%)** | +4 | Elec 14,063 / HVAC 19,708 / RMP 4,806 |

Per source (licenses / businesses / merged / held): electrical
14,067 / 14,037 / 30 / 256 · HVAC 20,500 / 20,500 / 0 / 775 · RMP
9,413 / 9,361 / 106 (49 in-run + 57 reuse) / 324.

### Verification

- **`node src/verify.ts`: 13/13 PASS** (12 Sprint 01 checks + new "no
  orphan businesses" check).
- **`node src/crosscheck.ts`: 100/100 PASS** (stratified sample, same
  strata as Sprint 01). Evidence: `etl/evidence/crosscheck-2026-11-25.json`
  (overwritten by this rebuild's run — same date, same 100/100 result).
- **`node src/backup.ts`: backup/restore OK, 14/14 tables match.**
  Dump: `/tmp/hcp-etl/backup/housecraftpros-2026-11-25.dump`.
- **Idempotency:** the rebuild was run twice with the final code (the
  first run predated the R-10 guard-case extension); the second run used
  a dropped + recreated DB. Both runs downloaded identical SHAs and
  produced identical counts — no churn between the two runs.

## 3. F5 / R-10 — reuse merges are now logged (T3)

`etl/src/sqlgen.ts` inserts one `dedupe_decisions` row per cross-run
business reuse (decision `merged`, rationale
`cross-source reuse from <source> ...`, `license_ids` = all licenses now
in the business, `decided_by` = `etl`), with guards:

- Skipped when the same business key was already merged in-run this run
  (the US3 row covers it) — **and the loader extends that row's
  `license_ids` to the whole business**, so the one decision still traces
  the whole merge.
- Skipped when no new license from this run joined the business. "New"
  means absent from the pre-load snapshot (`lic_before`): the UPDATE path
  rewrites `ingestion_run_id` for pre-existing licenses too, so that
  column alone cannot tell new from re-loaded (found by the guard test).

Result in the rebuild: **57 reuse rows**. Businesses with licenses from
>1 source: **58**. The 58th — **GTG AUTOMATION INC** (3 licenses:
2 RMP merged in-run on phone 4325234842 + 1 electrical) — has no separate
reuse row by design; its in-run merged decision now carries all 3
license_ids. **All 58 multi-source businesses are traceable to a
`merged` decision row with `business_id` set.**

Tests (`etl/tests/db.test.ts`, new): "cross-source reuse is logged as a
dedupe decision (R-10)" and "reuse + in-run merge of the same cluster:
one decision row covers the whole merge (R-10 guard)". Fixtures:
`etl/tests/fixtures/elec-reuse.csv` (2 rows) and
`elec-reuse-guard.csv` (2 rows). Recorded as resolved in
`docs/architecture/etl-pipeline.md` §8.

## 4. Two further loader bugs found by the new tests (T3)

| Bug | Symptom | Fix |
|---|---|---|
| Empty `dedupe.tsv` breaks COPY | A run with zero dedupe decisions (new electrical fixture) wrote a lone newline; `COPY stg_dedupe` failed with `missing data for column "license_type"` | `sqlgen.ts` writes an empty file (not a lone newline) when a TSV has no rows |
| Orphan business on re-run | Re-running a new file version inserted a duplicate business row for a license that already existed — when the business has no phone/address evidence the reuse JOIN cannot match it (fixture: the held business of RMP 1003) | `sqlgen.ts` only inserts a business row when ≥1 license with that business_key is new in the run; new `verify.ts` check "no orphan businesses" (13th check) |

Both fixes are covered by the new tests (the v2 test now asserts 20
businesses + 0 orphans after the re-run).

## 5. Review workflow for held clusters (T4)

`etl/src/review.ts` + `etl/src/review-cli.ts`:

- `--list [--limit 50]` — clusters whose **latest** decision is
  `held_ambiguous` (still awaiting review).
- `--show <cluster_key>` — licenses + businesses + latest decision.
- `--decide <key> --decision merge|keep-separate --by <id> [--note ...]`
  — prints a plan; executes only with `--confirm`. Merge moves all
  licenses into one business (most licenses, then most contact evidence,
  then earliest), deletes emptied business rows in the same transaction
  (each with an `audit_logs` row, `review.merge`), sets the target
  `merged`, records one `merged` decision (`human:<by>`). Keep-separate
  records one `rejected_no_merge` decision and moves nothing. Re-deciding
  throws; `--by` is required.

Live queue (rebuilt DB, measured 25/11 — see
`docs/reports/sprint-02-review-queue.md`):

- **965 distinct clusters awaiting review, covering 2,348 licenses.**
  (994 held rows reconcile exactly: 975 rows belong to the 965 queue
  clusters — 10 of them hold 2 held rows from 2 runs — plus 14 rows from
  clusters later merged by a subsequent load's evidence-based merge, plus
  5 rows from clusters later rejected on conflicting evidence.
  975 + 14 + 5 = 994. "Latest" is the CLI's definition: most recent
  `decided_at`, ties broken by `id DESC`.) Size: 2 licenses: 715 · 3: 166 · 4: 44 · 5: 25 · 6: 6 ·
  7: 4 · 8: 1 · 11: 2 · 12: 1 · 13: 1.
- 355 distinct clusters latest = `rejected_no_merge` (ETL decided, on
  conflicting evidence, not to merge — a human may still re-open them,
  but they are not in the queue).
- **No real cluster was decided in this sprint.** The workflow is built
  and tested (7 tests in `etl/tests/review.test.ts`, fixture
  `rmp-held-merge.csv`); the decisions belong to a human reviewer.

## 6. License lookup (T5)

`etl/src/lookup.ts` + `etl/src/lookup-cli.ts` — read-only SELECTs against
the local Postgres. Contract: `docs/specs/sprint-02/verify-contract.md`.

- `lookupByLicense(trade, number)` — exact match; expired returns
  expired (never "not found"); not found returns `found:false` + `.gov`
  guidance.
- `lookupByName(query, trade?)` — normalized-name match; `ambiguous:true`
  with all matches when >1 distinct business matches (identity = business
  **id**, never name — held clusters share one name); capped at 20, with
  `total_matches` reporting the true count.
- Every match carries `license_status` + `verification_level` +
  `license_status_source` + `status_as_of` + `display_note` ("License
  status as reported in [source] on [date]…") + `gov_url`. Nothing is
  labelled "Verified".

Smoke-tested on the rebuilt DB 25/11: license 17000 electrical →
active/inferred; 17019 → expired/inferred; 99999 → not found + guidance;
name "TDINDUSTRIES INC" → ambiguous, 22 businesses (20 matches shown of
a larger total). Tests: `etl/tests/lookup.test.ts` (7 tests, incl. a
synthetic suspended row — no suspended license exists in the sources).

## 7. Contractor Records deep profile (T6, carried over)

`research/contractor-records-deep-profile-2026-11-25.md` (previous
coordinator's work, added to the repo in this branch; public-web research
only, no PII). Headline: 1,571,825 permits, 57 full-coverage cities,
115 counts-only. **San Antonio, Dallas: counts-only (no firm lists);
Houston: absent; Austin: their stronghold (87,588 permits).** Clear field
for our wedge in 3 of 4 launch cities. Implications: lead with statewide
license verification; permit data is a Phase 2 enrichment, not a Sprint 02
dependency; recheck `/cities` quarterly.

## 8. ADR flips (T2)

| ADR | Basis for accepting (recorded in the file) |
|---|---|
| 0001 ETL in TypeScript now | Owner accepted Sprint 01 PR #1 (merged 25/11, commit 33fda85e) |
| 0002 Postgres is canonical | Same as 0001 |
| 0003 Hosting budget before production | Owner approved spec v2 (conditional GO 24/11) + authorised Sprint 01/02. Accepts the *rule*, not a host choice; no spending authorised |
| 0004 Cloudflare Workers vs Vercel Pro | Same as 0003. Stays a conditional recommendation from docs research only (no trial deploy); final choice still the Owner's, before public production |

## 9. Files changed (branch `sprint-02/lookup-and-review`, vs `main` @ d17c018)

New: `etl/src/lookup.ts`, `etl/src/lookup-cli.ts`, `etl/src/review.ts`,
`etl/src/review-cli.ts`, `etl/tests/lookup.test.ts`,
`etl/tests/review.test.ts`,
`etl/tests/fixtures/{elec-reuse,elec-reuse-guard,rmp-held-merge}.csv`,
`docs/specs/sprint-02/{spec,tasks}.md`,
`docs/specs/sprint-02/verify-contract.md`,
`docs/reports/sprint-02-report.md`,
`docs/reports/sprint-02-review-queue.md`,
`research/contractor-records-deep-profile-2026-11-25.md`.

Modified: `etl/src/sqlgen.ts` (R-10 logging + orphan fix + empty-TSV fix),
`etl/src/verify.ts` (13th check), `etl/tests/db.test.ts` (2 new tests +
orphan assertions), `etl/package.json` (test file list),
`etl/README.md` (lookup/review usage, 84 tests, R-10 note),
`docs/architecture/etl-pipeline.md` §8 (R-10 resolved),
`docs/architecture/decisions/ADR-000{1..4}-*.md` (accepted),
`etl/evidence/crosscheck-2026-11-25.json` (rebuild run's evidence).

## 10. Remaining errors and risks

| # | Item |
|---|---|
| R-1 (carried) | 965 held clusters (2,348 licenses) await human review. They must not be presented as merged businesses until reviewed. |
| R-2 (carried) | HVAC has no phone/address in the source (100%); 792 HVAC licenses fail even the thin-page rule. Source limitation, not an ETL defect. |
| R-3 (carried) | RMP: 4,695 no phone / 4,607 no address (business-level). Only 4,806/9,413 plumbing licenses have publishable contact. |
| R-10 | **Resolved in this sprint** (§3). The Sprint 01 dry-run's 58 unlogged merges are superseded by the rebuild, which logs them. |
| New | The `crosscheck-2026-11-25.json` evidence file now reflects the rebuild run, not Sprint 01's run (same date, both 100/100). |
| New | Fresh-download checksums differ from Sprint 01's (daily source churn). Any future rebuild must record its own SHAs; do not compare against Sprint 01's SHAs. |
| New | Suspended/revoked statuses are untestable on real data (none in the sources). If a source ever contains one, re-run the lookup acceptance cases. |
