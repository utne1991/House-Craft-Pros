# Sprint 01 QA report — Data Foundation (independent verification)

**QA:** Worker D (independent — built none of this work) · **Date:** 25/11/2026
**Scope:** Sprint 01 spec `docs/specs/sprint-01/spec.md` (US1–US13), tasks T030–T032
**Method:** evidence_collector + reality_checker skills (default NEEDS WORK unless
overwhelming). Every number below was re-measured by me; nothing is taken from the
dry-run report on trust. A claim I could not verify is marked **UNVERIFIED**, not passed.

**Environment used:** PostgreSQL 16.15 (cluster `16 main`, port 5432), database
`housecraftpros` (dry-run data, read-only access via `su postgres -c "psql …"` —
direct `psql` as root fails, role `root` does not exist); Node v24.22.1; Python 3.12.3.
I did NOT re-run the full load, did NOT touch `housecraftpros` or
`housecraftpros_test` with writes, and did NO GitHub operations.

## Overall verdict: NEEDS WORK (minor corrections, no ETL/data rework)

The data is real and the numbers check out: I re-ran the full test suite (68/68),
re-ran post-load verify (12/12), re-verified every headline DB count, independently
re-checked 24/100 cross-check licenses field-by-field against re-parsed CSVs
(24/24 pass), confirmed the benchmark's byte-identical outputs, and confirmed
migration idempotency on a scratch DB. **But the reports contain factual errors
that must be fixed before Owner acceptance:** the benchmark "medians" are actually
minimums (F1), the benchmark results file points at a raw-data path that does not
exist (F2), two §4 missing-data cells are off by one (F3), and the held-cluster
license count conflates two definitions (F4). None of these changes the data or
the stay-on-TypeScript recommendation — but a report the Owner is asked to accept
must not contain wrong numbers. Fix F1–F4, re-issue the two reports, done.

## Per-deliverable verdicts

| Deliverable | Verdict | One-line evidence |
|---|---|---|
| AGENTS.md + Sprint 00 doc sync + spec v2 fixes (US8) | **PASS** | AGENTS.md exists, fb434496 5-file correction in §7; spec v2 has all 4 fixes; README/docs say Next.js 16 |
| data-model.md | **PASS** | ERD + 14 tables (11 spec + 3 proposed with reasons §5); interfaces §6.1–6.4 |
| data-dictionary.md | **PASS** | `license_status` vs `verification_level` entries match the live DB CHECK constraints |
| etl-pipeline.md | **PASS** | Stage contracts + interfaces + reuse §7; O-1–O-4 resolved (O-1 re-measured exactly) |
| data-contract.md + JSON Schema (US12) | **PASS** | Contract v1, versioning rules present; all 43,976 licenses carry `contract_version='v1'` in the DB |
| Migrations (6 files) | **PASS** | All 6 applied twice on scratch DB `housecraftpros_qa`, 14 tables, 28 policies, RLS on all tables; scratch dropped |
| ETL code (`etl/src/`) | **PASS** | Zero deps, `type: module`, no Next.js imports, no bench import in `run.ts`, `duplicate_noop` path in code |
| Tests | **PASS** | `npm test` re-run by me: 68/68 (9+19+22 unit, 11 contract, 7 DB); `node src/verify.ts` 12/12 re-run |
| Dry-run report (`docs/reports/sprint-01-dry-run.md`) | **NEEDS WORK** | All headline counts verified, but F3 + F4 number nits and it repeats the F1 wrong "medians" in §10 |
| rust-readiness.md + benchmark (US10) | **NEEDS WORK** | Parity + byte-identical outputs verified, Rust DB-write honestly unmeasured, recommendation sound — but F1 (medians are minimums) and F2 (broken raw-data path) |
| ADRs 0001–0004 (US13) | **PASS** | All 4 exist, Context/Decision/Consequences, Status `proposed` |

## Method — what I ran

1. **Tests (T030):** `cd etl && npm test` — twice (full log `/tmp/qa-npm-test.log`).
   Also ran `node --test tests/` to confirm the documented Node 24 directory-form
   failure, and each test file individually for per-file counts.
   Also ran `node src/verify.ts` after reading it first: it issues only SELECTs
   (read-only), so it was safe to run against the dry-run DB.
2. **DB re-verification:** direct `psql` queries as the `postgres` OS user against
   `housecraftpros` (counts, per-source breakdowns, dedupe/business joins,
   publishable-contact rule, held-cluster reconciliation, multi-source businesses).
3. **Cross-check (T031):** own Python script `/tmp/qa-crosscheck.py` — picks 4
   samples per stratum (24 total) from `etl/evidence/crosscheck-2026-11-25.json`
   (license numbers only; the file's booleans ignored), re-parses the three source
   CSVs in `/tmp/hcp-etl/staging/` with Python `csv`, re-derives status/verification/
   phone/address with independent logic written from the contract rules, and compares
   against DB rows fetched via `psql` COPY.
4. **58-business step:** reconciled bench `businesses.json` (43,895) vs DB businesses
   (43,837) via per-source run summaries and a multi-source-business query.
5. **Benchmark:** `sha256sum` on all three canonical outputs per side (run1),
   recomputed medians/minimums from all six `summary.json` files in
   `/tmp/hcp-bench-out/`, checked input SHA-256s inside the summaries.
6. **Migrations:** scratch DB `housecraftpros_qa` (created, all 6 migrations applied
   twice from copies staged in `/tmp/qa-migrations/` — the `postgres` user cannot
   read `/home/hatch`, a known quirk also noted in `etl/src/pg.ts` — then dropped).
   First attempt from the repo path failed with `Permission denied`; that is a
   filesystem-permission artifact of my invocation, not a migration defect.
7. **Hygiene:** grepped the repo for secret patterns (`AKIA`, `ghp_`, `sk-`,
   `api_key`/`password` assignments, `BEGIN … PRIVATE KEY`); listed all
   `*.csv`/`*.dump`/`*.env*` files; read both test fixtures in full.
8. **Docs/contract/ADR/code:** grepped `data-contract.md`, `etl/contract/
   normalized-record.v1.json`, all 4 ADRs, `AGENTS.md`, spec v2, README and the
   three synced docs; checked `etl/package.json`, `grep -rn next etl/src/`,
   `grep bench etl/src/run.ts`, `etl/bench/rust-harness/Cargo.toml`.
9. **Socrata:** re-ran the `research/tdlr_counts.py` pattern live against
   `data.texas.gov/resource/7358-krk7.json` (total + by-license-type counts).
10. **Spot checks:** O-1 county disagreement recomputed from the raw CSVs in
    Python; NC-1/NC-2 URLs checked with `curl` (status codes only).

## Evidence — DB re-verification (§2–§6 of the dry-run report)

All queries run as `postgres` OS user, `psql -d housecraftpros`. **Every headline
number matches exactly:**

| Claim (report) | My result | Match |
|---|---|---|
| Licenses 43,976 | 43,976 | ✅ |
| Businesses 43,837 | 43,837 | ✅ |
| History rows 43,976 | 43,976 | ✅ |
| Holders 43,514 | 43,514 | ✅ |
| Locations 2,441 | 2,441 | ✅ |
| Runs 3, all `succeeded` | 3, all `succeeded` | ✅ |
| Dedupe decisions 1,433 (78 merged / 994 held_ambiguous / 361 rejected_no_merge) | 1,433 (78 / 994 / 361) | ✅ |
| Active 40,190 / expired 3,786 | 40,190 / 3,786 | ✅ |
| authority-confirmed 9,412 (8,742 active + 670 expired) | 9,412 (8,742 + 670) | ✅ |
| Inferred 31,448 active / 3,116 expired | 31,448 / 3,116 | ✅ |
| DB size 82,181,143 bytes | 82,181,143 | ✅ |
| Businesses by dedupe_status: single 40,625 / merged 134 / ambiguous_held 3,078 | 40,625 / 134 / 3,078 | ✅ |
| Per-source businesses: elec 14,037 / HVAC 20,498 / RMP 9,360 | 14,037 / 20,498 / 9,360 | ✅ |
| Per-source expired: 1,731 / 1,385 / 670; active: 12,335 / 19,113 / 8,742 | identical | ✅ |
| Per-source dedupe merged/held: 29/256, 0/774, 49/325 | identical (also in `/tmp/hcp-etl/load/*/run-summary.json`) | ✅ |
| Publishable: elec 14,062 / HVAC 19,705 / RMP 4,806 / total 38,573 (87.7%) | 14,062 / 19,705 / 4,806 / 38,573 | ✅ |
| No county 832; HVAC no county 793 | 832 / 793 | ✅ |
| Electrical no address 17; RMP no address 4,606 | 17 / 4,606 | ✅ |
| HVAC phone+address missing 100% (0 rows with either) | 0 | ✅ |
| `business.name_fallback` audit rows 435 | 435 (`action='business.name_fallback'`) | ✅ |
| Tables 14 | 14 (dry-run DB and restored DB) | ✅ |

Checksums re-measured with `sha256sum` on the staging CSVs — all three match §2
exactly (`071b46b1…048fb`, `fb632847…8b03c`, `6308c0e2…09848`).

## Evidence — tests and verify (re-run by me)

- `npm test`: **68/68 pass, 0 fail** (both runs). Per file, run individually:
  `csv.test.ts` 9, `normalize.test.ts` 19, `validate-dedupe-anomaly.test.ts` 22
  (= 50 unit), `contract.test.ts` 11, `db.test.ts` 7. Matches the report's
  50/11/7 split exactly.
- `node --test tests/` (directory form) fails on Node 24 as the report states —
  confirmed: `test at tests:1:1 / 'test failed'`. This is a Node quirk, not a test
  failure; `npm test` uses the explicit file list. Not a defect.
- `node src/verify.ts`: **12/12 PASS** re-run (read-only; verified by reading the
  file first — only SELECTs via `pg.ts`).
- `etl/package.json`: `"type": "module"`, **no `dependencies` field at all** (zero deps).
- `grep -rn next etl/src/`: only false positives (`nextBusinessKey`, `argv` `next`,
  a comment "next run") — no Next.js import. `etl/src/run.ts` imports only
  `./anomaly|csv|dedupe|normalize|pg|sqlgen|validate` — no bench/Rust import.
- Rust harness: `etl/bench/rust-harness/src/main.rs` line 1 marks it
  `(NON-PRODUCTION)`; `Cargo.toml` has **no dependencies** (std-only, release
  opt-level 3); `etl/bench/README.md` marks the directory NON-PRODUCTION.

## Evidence — cross-check sample (independent, 24/24 PASS)

Script `/tmp/qa-crosscheck.py` (my own Python re-implementation of the
normalization rules; the evidence file supplied only license numbers).
4 samples per stratum, 22 fields each (number, type, subtype, dates, status,
verification, status source, holder, business name, phone + normalized, address
line1/line2/city/state/zip/county, insurance company/expiry, endorsements).
Business contact fields compared only for single-license businesses (all 24
sampled licenses were single-license, so all 22 fields were compared for all 24).

| Sample | Result |
|---|---|
| electrical active 17000, 27865, 36219, 41637 | PASS ×4 |
| electrical expired 17019, 27492, 37029, 39679 | PASS ×4 |
| hvac active 10001, 15460, 29073, 9374 | PASS ×4 |
| hvac expired 100090, 143255, 29133, 76801 | PASS ×4 |
| plumbing active 1, 37543, 42946, 47174 | PASS ×4 |
| plumbing expired 10051, 18448, 41199, 44821 | PASS ×4 |

**24/24 PASS, 0 FAIL.** This corroborates (does not prove) the report's 100/100;
the remaining 76 samples were not re-checked by me. Note the evidence file's
`address_state` fix (compare against load-time `'TX'` default) is real: my script
had to apply the same rule, and all 24 passed with it.

## Evidence — the 43,895 → 43,837 step (RESOLVED)

- In-run dedupe partition 43,895 is independently corroborated two ways:
  bench `businesses.json` has 43,895 entries, and the per-source run summaries
  sum to 14,037 + 20,498 + 9,360 = 43,895.
- DB businesses = 43,837. Delta = 58.
- My query: **exactly 58 businesses hold licenses from more than one source**
  (`SELECT business_id FROM licenses GROUP BY 1 HAVING count(DISTINCT source_id)>1`
  → 58), covering 117 licenses. No other explanation is needed: the loader's
  cross-source business reuse (same name+phone/address rule, `etl/src/sqlgen.ts`
  ~line 257, "reuse an existing business on name + phone/address") accounts for
  all 58. **The 58 is explained by evidence, not an open delta.**
- Caveat (F5): those 58 reuse merges have **no `dedupe_decisions` row** — all 1,355
  held/rejected decisions have `business_id IS NULL`, and only the 78 `merged`
  decisions carry a `business_id`. The merges are detectable post-hoc (the
  58 multi-source businesses) but not recorded as decisions.

## Evidence — benchmark parity spot-check

- `/tmp/hcp-bench-out/{ts,rs}/run{1,2,3}/` all exist with `summary.json` +
  canonical outputs. Input SHA-256s inside every `summary.json` match the §2
  checksums exactly. Counts in summaries: 43,976 records, 43,895 businesses,
  78 merged, 1,355 held, 40,190 active / 3,786 expired / 0 unknown — both sides.
- Byte-identical outputs confirmed by `sha256sum` (run1):
  `records.jsonl b1989c6c522f9cf9…` (both sides, 42,906,627 bytes),
  `businesses.json 01188dd7b8323e32…`, `dedupe.json 047c4ec39a39bd46…`.
  These match the first-16-hex prefixes in `rust-readiness.md` §3.
- **F1 (see findings):** the numbers labelled "median" in both benchmark reports
  are the **minimum** of the 3 runs. True medians recomputed from the summaries:
  TS wall 2,715 ms (reported 2,674), Rust wall 3,227 ms (reported 3,204);
  TS user CPU 2,900.8 ms (reported 2,872.1), Rust 3,020.0 (reported 2,990.0);
  TS sys CPU 484.3 ms (reported 421.0), Rust 180.0 (reported 160.0);
  TS peak RSS 708,024 KB (reported 661,932 KB), Rust 195,524 KB (reported 195,520 KB).
  The per-run detail lines in `rust-readiness.md` §3 are correct; only the
  "median" label/headline numbers are wrong. The recommendation still follows:
  with true medians TS is still faster on wall (2,715 vs 3,227 ms) and Rust is
  still ~3.6× lighter on memory (708 MB vs 196 MB) — the qualitative conclusion
  (stay on TypeScript) is unchanged.
- **F2:** `etl/bench/results-2026-11-25.md` "Raw data" says summaries live at
  `bench/out/ts/run{1,2,3}/summary.json` — **`etl/bench/out/` does not exist in
  the repo** (confirmed with `ls`; `.gitignore` excludes `etl/bench/out/`).
  The real location is `/tmp/hcp-bench-out/{ts,rs}/run{1,2,3}/summary.json`, which
  is what `rust-readiness.md` §2 correctly cites. Broken evidence pointer.
- Rust DB-write speed: honestly reported as NOT measured in both reports and in
  the dry-run report §7/§10. Confirmed: the harness has no loader. No number is
  claimed. ✅ (US10 requires this honesty; it is present.)
- TS DB-write times (~6 s RMP / ~9 s elec / ~10 s HVAC incl. ~2 s download):
  **UNVERIFIED by me** — I did not re-run a load (would disturb the dry-run DB).

## Evidence — migrations idempotency (independent)

Scratch DB `housecraftpros_qa`: all 6 migrations applied **twice**, all 12
applications PASS (second run emits only `NOTICE: relation … already exists,
skipping` / `policy … does not exist, skipping` notices, exit 0). Result: 14
tables, 28 RLS policies. Scratch DB dropped afterwards. Dry-run DB untouched.
(`housecraftpros_test` was not touched; it is the test suite's own scratch DB and
the test run I did used it as designed.)

## Evidence — repo hygiene

- Secret grep (`AKIA…`, `ghp_`/`gho_`, `sk-…`, `api_key`/`password` assignments,
  `BEGIN … PRIVATE KEY`): **zero hits**.
- Only CSVs in the repo: `etl/tests/fixtures/rmp-v1.csv` (22 lines) and
  `rmp-v2.csv` (21 lines). Both are **synthetic**: 555-range phones
  (`5125550100`, `2145551004`), placeholder names (`SMITH/JOHN`, `JONES/MARY`,
  `HOLDER1004/FIRST1004`, `COMPANY 1004 LLC`, `ACME INSURANCE`). No real-looking
  phone numbers or names from the source CSVs. ✅
- No `.dump`, no `.env`, no raw government CSVs in the repo. `.gitignore` covers
  raw CSVs, staging files, dumps, `etl/bench/out/`, `**/target/`.
- RLS: `pg_tables` shows `rowsecurity=true` on **all** public tables in the
  dry-run DB; `\d licenses` shows `licenses_anon_deny` (`USING (false)` for
  `app_anon`) and `licenses_admin_all`. Spot-checked, not exhaustively audited
  per table/role.

## Evidence — contract, ADRs, docs

- `docs/architecture/data-contract.md` (301 lines): contract v1, JSON Schema +
  SQL DDL as canonical sources, versioning rules (optional field = minor,
  breaking change = major + migration note), `contract_version` const `"v1"`.
  `etl/contract/normalized-record.v1.json` exists; `required` includes
  `contract_version`. DB check: 0 licenses with `contract_version <> 'v1'`
  (via `verify.ts`, re-run).
- ADRs: all 4 exist in `docs/architecture/decisions/` with `## Context /
  ## Decision / ## Consequences` and `Status: proposed` (0001 ETL language,
  0002 Postgres canonical, 0003 hosting timing, 0004 Workers vs Vercel Pro). ✅
- `AGENTS.md` exists at repo root; §7 records the fb434496 5-file correction
  with the exact file list. Spec v2 spot-check: Cloudflare Workers evaluation
  with cited pricing (§2.2), commercial hosting decision "before public
  production" (§2.2, §6.4, line 274), two publication gates
  (`data_published_at` / `seo_index_published_at`, line 125), `license_status`
  vs `verification_level` split (§3). README + `cau-truc-site.md` +
  `dinh-huong-2026-11-24.md` say Next.js 16; remaining "Next.js 14" mentions
  are historical (FarmDirect's version / EOL note), not contradictions.
  `docs/spec-mvp-texas.md` (v1 SUPERSEDED) — **UNVERIFIED whether untouched**:
  the working tree is not a git checkout (`git status` → "not a git repository"),
  so I cannot diff it or verify the fb434496 5-file claim against git history.
  The correction is recorded in AGENTS.md §7 and dry-run §13 as required; the
  underlying git fact is unverified by me.
- `data-model.md` (447 lines): ERD + 14 tables — 11 from spec v2 §4 plus 3
  proposed in §5 with technical reasons (`dedupe_decisions`, `source_conflicts`,
  +1); interfaces §6.1 source adapter, §6.2 normalized record, §6.3 loader,
  §6.4 DB contract. ✅
- `etl-pipeline.md` (267 lines): stage contracts + interfaces, reuse points §7
  for the Bee ecosystem, O-1–O-4 in §8. `data-dictionary.md` (308 lines):
  `license_status`/`verification_level`/`license_status_source` entries match
  the live CHECK constraints (incl. `licenses_inferred_rule`).
- Dry-run report required sections (T040): done/not done ✅, per-source counts +
  as-of dates + checksums ✅, dedupe + ambiguous clusters ✅, expired +
  missing-data ✅ (modulo F3), publishable contact ✅, DB size ✅, cross-check ✅,
  test results ✅ (per-suite counts; per-test names are in the `npm test` output,
  not listed individually in the report), risks ✅, execution evidence ✅,
  Rust summary ✅, fb434496 note ✅.
- O-1 recomputed from raw CSVs: electrical 908/14,066 = **6.46%** ✅, HVAC
  4,977/20,498 = **24.28%** ✅ — exact match.
- NC-1 verified live with `curl`: `licfile.asp` path 200, bare `/licfile.asp`
  404 ✅. NC-2: direct CSV URL `https://tsbpe.texas.gov/download-csv/RMP/`
  returns 200 ✅. Note: the TSBPE landing page now returns **200** via curl,
  not the 403 the report records for 25/11 — time-sensitive, core claim unaffected.
- O-2 (no pointer column; query latest `succeeded` run): stated in report §9,
  consistent with schema (no pointer column in `ingestion_runs`). O-3:
  `stale_running_hours: 24` present in `etl/config/sources.json` ✅. O-4:
  `pg_dump -Fc` — backup dump exists at `/tmp/hcp-etl/backup/
  housecraftpros-2026-11-25.dump` (11,244,580 bytes ≈ 11.2 MB ✅); restore DB
  `housecraftpros_restore` exists with 43,976 licenses, 43,837 businesses,
  14 tables, size 63,478,807 bytes (~61 MB ✅) — the report's "14/14 tables
  match" is corroborated on counts; I did not diff every table row-by-row.
- `etl/README.md` documents the `duplicate_noop` behaviour (no new run row on
  a duplicate re-run; retry after a failed run reuses the same run row id);
  the code path is in `etl/src/run.ts` ~lines 245–265 (UNIQUE
  `(source_id, sha256_checksum)` index). Live duplicate re-run **not** re-run
  by me (would touch the dry-run DB); covered by `db.test.ts` idempotency test
  (passes) + code inspection. The pipeline doc §D5 literal wording vs actual
  behaviour is a documented deviation, not a hidden one.

## Evidence — Socrata reconciliation (independent re-run)

Live query against `data.texas.gov/resource/7358-krk7.json`, same pattern as
`research/tdlr_counts.py`, run by me 25/11/2026:
total rows **976,150** ✅; Electrical Contractor **14,071** (CSV 14,066 → Socrata
+5 ✅); A/C Contractor **20,480** (CSV 20,498 → CSV +18 ✅). Exactly the §6 figures.

## Findings

### F1 — Benchmark "median" figures are actually minimums (Medium)
**Where:** `docs/architecture/rust-readiness.md` §3 + `etl/bench/results-2026-11-25.md`
+ dry-run report §10 (all repeat the same numbers).
**Evidence:** from `/tmp/hcp-bench-out/{ts,rs}/run{1,2,3}/summary.json` —
TS wall runs 2,715 / 2,674 / 2,737 ms: reported "median" 2,674 = minimum, true
median 2,715. Rust wall 3,308 / 3,227 / 3,204: reported 3,204 = minimum, true
median 3,227. Same pattern for user CPU (TS 2,872.1 reported vs 2,900.8 median;
Rust 2,990.0 vs 3,020.0), system CPU (TS 421.0 vs 484.3; Rust 160.0 vs 180.0)
and TS peak RSS (661,932 KB reported vs 708,024 KB median). Rust RSS is
unaffected in substance (195,520 vs 195,524 KB).
**Impact:** the stay-on-TypeScript recommendation still follows from the true
medians (2,715 vs 3,227 ms wall; 708 vs 196 MB RSS), so this does not flip any
decision — but a benchmark report must not mislabel its central statistic.
**Fix:** correct all headline figures to true medians (or relabel them "best of
3") in all three files, and state the aggregation rule explicitly.

### F2 — Benchmark results file points at a raw-data path that does not exist (Medium)
**Where:** `etl/bench/results-2026-11-25.md`, "Raw data" section.
**Evidence:** it cites `bench/out/ts/run{1,2,3}/summary.json` and
`bench/out/{ts,rs}/run1/{records.jsonl,businesses.json,dedupe.json}`.
`ls etl/bench/out` → "No such file or directory"; `.gitignore` excludes
`etl/bench/out/`. The real files are at `/tmp/hcp-bench-out/{ts,rs}/run{1,2,3}/`
(which `rust-readiness.md` §2 cites correctly).
**Fix:** correct the paths in `results-2026-11-25.md` to `/tmp/hcp-bench-out/…`
(or to the intended committed location if the outputs are meant to be archived
elsewhere — do not commit the PII-bearing outputs to the repo to fix the pointer).

### F3 — Two §4 "missing data" phone counts are off by one (Low)
**Where:** dry-run report §4, "Missing data" table.
**Evidence:** my queries (phone lives on `businesses`, joined via
`licenses.business_id`): electrical no-phone **6**, report says 7; RMP no-phone
**4,694**, report says 4,695. (Electrical no-address 17, RMP no-address 4,606,
no-county 832, HVAC no-county 793 all match.) The publishable-contact totals
still reconcile exactly (14,062 / 4,806 / 38,573), so the discrepancy is in the
counting rule, not the data — most likely record-level (pre-loader) vs
business-level (post-loader cross-source reuse) counting: one license per source
has no phone on its own CSV row but sits in a business that got a phone from a
sibling license.
**Fix:** correct the two cells to 6 and 4,694, or state the counting rule
(record-level vs business-level) that yields 7 and 4,695.

### F4 — Held-cluster license count conflates two definitions (Low)
**Where:** dry-run report §3 ("1,355 clusters held back in total, covering
3,079 licenses across 3,078 businesses") and §11 R-1 ("1,355 ambiguous clusters
(3,079 licenses) held").
**Evidence:** `SELECT sum(cardinality(license_ids))` over the 1,355
held/rejected `dedupe_decisions` = **3,099** distinct license IDs, not 3,079.
3,079 is the count of licenses currently sitting in `ambiguous_held`
businesses; 21 of the 3,099 held-cluster licenses now live in `merged`
businesses (18 of them also appear in a `merged` decision — cluster-split
overlap; the 1 ambiguous_held business with 2 licenses accounts for the
3,079-vs-3,078 difference). Both numbers are real; the sentence ties the wrong
one to the 1,355 clusters.
**Fix:** reword to "1,355 clusters held, covering 3,099 license IDs; 3,079 of
those licenses sit in 3,078 `ambiguous_held` businesses (21 were attached to
merged businesses via loader cross-source reuse)" — or equivalent.

### F5 — Cross-source business reuse (58 merges) leaves no decision record (Low)
**Where:** loader behaviour, `etl/src/sqlgen.ts` (~line 257); US3 requires merge
decisions to be recorded.
**Evidence:** the 58 is verified (see §"Evidence — the 43,895 → 43,837 step"),
but all 1,355 held/rejected decisions have `business_id IS NULL` and only the
78 in-run `merged` decisions carry a `business_id`. A reviewer cannot list the
58 reused businesses from `dedupe_decisions` — only by the post-hoc query
(businesses with licenses from >1 source).
**Fix:** log each cross-source reuse (e.g. a `dedupe_decisions` row with
decision `merged`, rationale `cross-source reuse`, or an audit-log entry) so
every business merge is traceable; or document it as a known traceability gap
in `etl-pipeline.md`.

### F6 — TSBPE landing page no longer returns 403 (Info, no fix needed)
**Where:** dry-run report §11 R-6 / §2 NC-2.
**Evidence:** my `curl` 25/11/2026 returns 200 for
`https://tsbpe.texas.gov/free-licensee-list/` (report recorded 403 via curl).
The material claim — the direct CSV URL works (200) — is confirmed. Likely
transient/WAF behaviour; no action, just don't cite the 403 as current.

## Unverified / not tested (honest scope limits)

- **Empty-schema size 8,711 kB** (dry-run §6): cannot re-verify without rebuilding
  an empty schema and measuring; my scratch DB was dropped without a size reading.
- **TS DB-write times** (~6/9/10 s per source): not re-timed; would require a load.
- **Live `duplicate_noop` re-run:** not re-run by me; covered by the DB test
  suite's idempotency test + code inspection only.
- **Remaining 76/100 cross-check samples:** my independent re-check covered 24;
  the other 76 are corroborated only by the evidence file's booleans.
- **Backup/restore row-level equality:** restore DB counts match (43,976 /
  43,837 / 14 tables); I did not diff every table row-by-row.
- **RLS per-table/per-role audit:** RLS is enabled on all tables and the
  `licenses` anon-deny/admin-all policies were inspected; I did not exhaustively
  test every role against every table.
- **fb434496 5-file claim / v1 spec untouched:** unverifiable in this working
  tree (not a git checkout).
- **US4 disappeared/suspended/conflict paths beyond the dry-run:** the dry-run
  was a first load (0 disappeared, 0 conflicts by construction); those code paths
  are covered by `db.test.ts` (7 pass) only, not by live data.
- **US5 anomaly/rollback paths beyond tests:** same — covered by unit/DB tests,
  not exercised against the live dry-run DB.

## Required next steps (before Owner acceptance)

1. Fix F1: correct the benchmark medians (or relabel "best of 3") in
   `rust-readiness.md`, `etl/bench/results-2026-11-25.md`, dry-run §10.
2. Fix F2: correct the raw-data paths in `etl/bench/results-2026-11-25.md`.
3. Fix F3 + F4: correct the two phone cells and the held-cluster wording in
   the dry-run report.
4. Fix or document F5 (reuse-merge traceability).
5. Re-issue the two reports; QA re-check is a read of the corrected numbers
   only — no re-run of the ETL or benchmark is needed (the underlying data and
   summaries are already verified).

---
**QA Agent:** Worker D (independent) · **Evidence date:** 25/11/2026 ·
**Test log:** `/tmp/qa-npm-test.log` · **Cross-check script:** `/tmp/qa-crosscheck.py`
· **Scratch DB `housecraftpros_qa`:** created, used, dropped. Dry-run DB untouched.
