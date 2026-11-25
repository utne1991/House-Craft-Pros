# PR draft — Sprint 01: Data Foundation (House Craft Pros)

**Branch:** `sprint-01/data-foundation` (from `main` @ `fb434496`) → **Base:** `main`
**Status:** ready for Owner acceptance review. No merge, no deploy in this PR.
**Spec:** `docs/specs/sprint-01/spec.md` · **Plan:** `docs/specs/sprint-01/plan.md` ·
**Tasks:** `docs/specs/sprint-01/tasks.md` · **Dry-run report:**
`docs/reports/sprint-01-dry-run.md` · **QA report:** `docs/reports/sprint-01-qa.md`

## Summary

Sprint 01 builds the verifiable data foundation for House Craft Pros (Texas MVP):
fresh government license data (TDLR electrical + HVAC, TSBPE plumbers) downloaded
25/11/2026, normalized, carefully deduped, loaded into real PostgreSQL 16.15 with
full history, and validated by a 100-license cross-check, 68 automated tests, and
an independent QA review. It also closes Sprint 00 (AGENTS.md, doc sync, spec v2
fixes) and delivers the RUST-READY architecture work: language-independent
versioned data contract, backend-swappable interfaces, 4 ADRs, and a
TS-vs-Rust benchmark with parity on real data.

**Key numbers (dry-run, local Postgres `housecraftpros`, 25/11/2026):**

| | Count |
|---|---|
| Licenses loaded (fresh downloads, SHA-256 recorded) | **43,976** — electrical 14,066; HVAC 20,498; RMP 9,412 |
| Businesses after dedupe | **43,837** (holders 43,514; locations 2,441; history rows 43,976) |
| Dedupe decisions | 1,433 — 78 merged; **1,355 clusters held** (994 ambiguous + 361 rejected), covering 3,099 license IDs |
| Active / expired / unknown | 40,190 / 3,786 / 0 (8,742 authority-confirmed + 31,448 inferred active) |
| Profiles with publishable contact info | **38,573 / 43,976 (87.7%)** |
| Database size (measured) | **82,181,143 bytes (78 MB)** vs 8,711 kB empty schema |
| Cross-check | **100/100 PASS** (field-by-field vs source CSVs; QA independently re-checked 24/24) |
| Tests | **68/68 PASS** (50 unit + 11 contract + 7 DB) + verify 12/12 + backup/restore 14/14 tables |
| Socrata reconciliation | Electrical 14,071 vs CSV 14,066 (+5); A/C 20,480 vs 20,498 (−18) — snapshot/cadence difference |

**Rust benchmark (COMPLETE, parity: same files/SHA-256, same machine, same
rules):** TS wall **2,715 ms** (median of 3) vs Rust 3,227 ms; TS RSS 708 MB vs
Rust 196 MB; all three canonical outputs byte-identical (43,976 records).
**Recommendation: stay on TypeScript** at ~44k licenses; Rust DB-write was NOT
measured (harness has no loader — stated, not speculated). Details:
`docs/architecture/rust-readiness.md`.

## What changed (by area)

**Sprint 00 completion (Worker A)**
- `AGENTS.md` (new) — operating manual + push convention with the fb434496
  correction (commit `fb434496` changed **5 files** on GitHub, not 16 — the
  other 11 manifest paths were byte-identical to HEAD).
- `README.md`, `docs/cau-truc-site.md`, `docs/cay-bai-viet-lien-ket.md`,
  `docs/dinh-huong-2026-11-24.md` — synced with spec v2 (Next.js 16, $0 =
  experiment budget, two publication gates, "Verified" rules, sitemap index).
  `docs/spec-mvp-texas.md` (v1, SUPERSEDED) untouched.
- `docs/spec-mvp-texas-v2.md` — `license_status` split from
  `verification_level`; data publication split from SEO-index publication;
  Cloudflare Pages replaced by a researched Cloudflare Workers (OpenNext)
  evaluation; commercial hosting decision moved to **before public production**.

**Data model + migrations (Worker B)**
- `docs/architecture/data-model.md` (ERD, 14 tables: 11 spec + 3 proposed with
  reasons), `data-dictionary.md`, `etl-pipeline.md` (stage contracts + Bee
  reuse points), `data-contract.md` + `etl/contract/normalized-record.v1.json`
  (JSON Schema, contract v1; SQL DDL as canonical sources).
- `db/migrations/0001–0006_*.sql` — PostgreSQL 16, idempotent (applied twice:
  6/6 + 6/6), RLS on all 14 tables, `contract_version` on `ingestion_runs` +
  `licenses`. **PostgreSQL 16.15 runs locally and the migrations were executed
  against it — no SQLite stand-in was needed.**

**ETL engine + dry-run (Worker C)**
- `etl/` — TypeScript, zero dependencies, Node 24, `etl/src/` (11 files),
  loads into real Postgres via generated SQL/COPY + `psql`; config-driven per
  source/state/trade; no Next.js imports; `etl/tests/` (68 tests);
  `etl/bench/` — Rust benchmark harness, marked NON-PRODUCTION, not in the
  production path; `etl/package.json` (`type: module`, zero deps);
  `etl/README.md`; `.gitignore` (CSVs, dumps, bench outputs).
- `docs/reports/sprint-01-dry-run.md` (FINAL, coordinator-reviewed after QA),
  `docs/architecture/rust-readiness.md`, `etl/bench/results-2026-11-25.md`.

**ADRs (all Status: `proposed` — become `accepted` only on Owner acceptance
of this PR)**
- `docs/architecture/decisions/ADR-0001-etl-language-typescript-now-rust-ready.md`
- `ADR-0002-postgres-canonical-source.md`
- `ADR-0003-hosting-decision-timing.md`
- `ADR-0004-cloudflare-workers-vs-vercel-pro.md`

## How to verify

```bash
cd etl && npm test            # expect 68/68 pass (50 unit + 11 contract + 7 DB)
node src/verify.ts            # expect 12/12 pass (read-only SELECTs)
# DB (local Postgres 16, database housecraftpros):
su postgres -c "psql -d housecraftpros -At -c \"SELECT count(*) FROM licenses;\""
# expect 43976; businesses 43837; license_status_history 43976; ingestion_runs 3
# Benchmark raw summaries: /tmp/hcp-bench-out/{ts,rs}/run{1,2,3}/summary.json
# (kept out of the repo — canonical outputs contain real licensee PII)
```

## Acceptance checklist

- [ ] Dry-run numbers accepted (43,976 licenses / 43,837 businesses / 38,573 publishable)
- [ ] QA report read — overall verdict NEEDS WORK on doc nits F1–F4; fixes
      applied by the coordinator and recomputed from primary sources (DB,
      summary.json files, staging CSVs). **QA re-read of the corrected pages
      recommended before acceptance (read-only, no re-run needed).** The
      re-read should also cover the pre-push PII fix below.
- [ ] PII fix verified: two inline test fixtures in
      `etl/tests/normalize.test.ts` were verbatim real source rows
      (names/addresses/phones); replaced with synthetic 555 values before
      push, tests re-run 68/68 by the parent. QA's "fixtures synthetic"
      claim was incorrect for this file.
- [ ] ADRs 0001–0004 accepted (status flips to `accepted` on merge)
- [ ] Known gaps below acknowledged (esp. F5 traceability gap → Sprint 02)
- [ ] First **live** ETL load is NOT part of this PR — it needs separate
      Owner/anh Út approval of these numbers (repo `AGENTS.md` §4)
- [ ] No merge to `main` without Owner acceptance + anh Út approval for code

## Known gaps / risks (see dry-run §11, R-1–R-10, and QA report)

- **PII fix (pre-push, parent verification):** two inline test fixtures in
  `etl/tests/normalize.test.ts` (`tdlrRow` / `rmpRow`) were verbatim real
  source rows — real names, street addresses, and phone numbers from the
  TDLR/TSBPE CSVs. QA's "fixtures synthetic" claim missed them (QA read the
  two CSV fixtures, not this inline TS fixture). Fixed before push: all
  identifying values replaced with synthetic 555-range data, tests re-run
  68/68, repo re-grepped clean. No real PII remains in the branch.

- **F5 / R-10 (traceability gap):** the 58 cross-source business-reuse merges
  leave no `dedupe_decisions` row (detectable post-hoc only). Follow-up in
  Sprint 02: log each reuse as a decision. Do not present the 58 as
  individually reviewed merges.
- **1,355 ambiguous clusters (3,099 license IDs)** held for human review — no
  review workflow built yet (Sprint 02+).
- **HVAC has no phone/address in the source (100%)**; RMP phone only ~50% —
  source limitations, not ETL defects. 793 HVAC licenses have no county either.
- **Rust DB-write speed NOT measured** (no Rust loader in this sprint).
- QA's honest scope limits (not re-verified): empty-schema size, TS DB-write
  timings, live `duplicate_noop` re-run, remaining 76/100 cross-check samples,
  backup row-level diff, exhaustive per-role RLS audit, US4/US5 live-data paths
  beyond tests (first load had 0 disappeared/conflicts by construction),
  fb434496 git fact (working tree is not a git checkout).
- TSBPE landing page returned 403 via curl during the dry-run, 200 on QA's
  later check — transient; the direct CSV URL works (200).
- No production deploy, no cloud resources created, $0 spent in this sprint.
