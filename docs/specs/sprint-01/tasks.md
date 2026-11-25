# Sprint 01 — Data Foundation: Tasks

**Spec:** `spec.md` · **Plan:** `plan.md` · **Branch:** `sprint-01/data-foundation`
**Work dir:** `/home/hatch/workspace/trades-directory/repo/` (local only — no worker touches GitHub)

## Phase 0 — Sprint 00 completion (US8) — worker A, [P] with Phase 1
- [x] T001 [P] Write `AGENTS.md` (repo root): project, stack, hard rules, ETL/test commands,
      branch/PR workflow, push convention (report CHANGED files, not manifest paths; record the
      fb434496 correction: 5 files changed, not 16).
- [x] T002 [P] Sync `README.md`, `docs/cau-truc-site.md`, `docs/cay-bai-viet-lien-ket.md`,
      `docs/dinh-huong-2026-11-24.md` with spec v2 (Next.js 16, $0 = experiment budget, two
      publication gates, "Verified" rules, sitemap index). Do NOT edit `docs/spec-mvp-texas.md` (v1 SUPERSEDED).
- [x] T003 [P] Fix `docs/spec-mvp-texas-v2.md` (+ README line if it repeats the point):
      (a) split `license_status` / `verification_level`; (b) split data publication /
      SEO-index publication gates; (c) replace Cloudflare Pages with a researched, cited
      Cloudflare Workers (OpenNext) evaluation vs Vercel Pro $20/mo; (d) commercial hosting
      decision BEFORE public production.
- [x] T004 Verify T001–T003 by re-reading the edited files; list every file changed.
- [x] T005 [P] Write `docs/architecture/decisions/ADR-0003-hosting-decision-timing.md`
      (commercial hosting decided BEFORE public production) and
      `docs/architecture/decisions/ADR-0004-cloudflare-workers-vs-vercel-pro.md` (per the actual
      T003c evaluation results, with numbers + sources). Format: Context / Decision /
      Consequences / Status; Status = "proposed".

## Phase 1 — Data model + migrations (US2/US4/US6/US9) — worker B, [P] with Phase 0
- [x] T010 Write `docs/architecture/data-model.md`: ERD (Mermaid) + table descriptions for the
      11 spec-v2 tables; define the source adapter interface, normalized record schema, loader
      interface, DB contract (US9). Document any additional table proposed, with a technical reason.
- [x] T011 Write `docs/architecture/data-dictionary.md`: every column (type, nullable, meaning,
      source field, validation rule), incl. `license_status` vs `verification_level` and the two
      publication-gate fields.
- [x] T012 Write numbered idempotent migrations `db/migrations/0001_*.sql` … for all tables,
      with RLS policies (public read only publishable fields; admin-only write), PII column
      restrictions, indexes, and comments. PostgreSQL dialect is the contract.
- [x] T013 Attempt a real local Postgres (e.g. `sudo apt install postgresql` / `initdb` in home
      dir); record the attempt and outcome. If it works, execute the migrations against it and
      record the result; if not, record why and the residual risk.
- [x] T014 Write `docs/architecture/etl-pipeline.md` skeleton: stage contracts + interfaces
      (completed jointly with Phase 2 worker; single owner: worker B writes the doc, worker C
      implements to it — disagreements resolved by the coordinator).
- [x] T015 Write `docs/architecture/data-contract.md` + JSON Schema files in `etl/contract/`
      (normalized record, contract v1): JSON Schema + SQL DDL are the canonical contract
      sources. Add `contract_version` (text, e.g. 'v1') to `ingestion_runs` in the migrations
      and require it on normalized records/metadata. Document versioning rules (optional field
      = minor, breaking change = major + migration note). Note in `data-model.md` that TS types
      are derived, not canonical.
- [x] T016 Write `docs/architecture/decisions/ADR-0001-etl-language-typescript-now-rust-ready.md`
      and `docs/architecture/decisions/ADR-0002-postgres-canonical-source.md` (Context /
      Decision / Consequences / Status; Status = "proposed").
- [x] T017 In `etl-pipeline.md`, add a reuse-points section for the Bee ecosystem
      (config-driven per source/state/trade, no hardcode) — design for reuse, stop there; no
      Bee Core Engine.

## Phase 2 — ETL engine + dry-run (US1–US5, US7, US9, US10) — worker C, after T010–T012
- [x] T020 Download FRESH TDLR `Lteecele.csv`, `ltairref.csv` + TSBPE RMP list (URLs/method in
      `~/workspace/trades-directory/research/`: `tdlr_counts.py`, `tdlr_licfile.html`,
      `tsbpe_list.html`). Record URL, file date, SHA-256, row counts. Fallback to Nov-24 local
      copies ONLY if download fails, stating the as-of date. CSVs stay OUT of the repo
      (staging: `~/workspace/trades-directory/research/raw/` or `/tmp`).
- [x] T021 Implement `etl/` (TypeScript, zero deps, erasable syntax, Node 24): download, parse,
      normalize, dedupe (conservative — ambiguous clusters to human-review list), load, verify.
      No Next.js imports; config per source/state/trade; implements the interfaces from T010/T014.
- [x] T022 Tests with `node:test` in `etl/tests/` (idempotency, anomaly detection, rollback,
      backup export/restore, dedupe rules, status/verification split, disappeared-record
      handling). Test-first where feasible; all tests must pass and be re-runnable.
- [x] T023 Full dry-run end-to-end on real data (Postgres if T013 succeeded, else `node:sqlite`
      stand-in — labeled as stand-in). Record per-source counts, businesses after dedupe,
      ambiguous clusters held back, expired + missing-data counts, publishable-contact counts,
      measured DB size.
- [x] T024 Cross-check ≥100 sampled licenses across 3 trades and the statuses present in real
      data, field-by-field vs source CSV rows; record pass/fail per sample. Reconcile totals vs
      TDLR Socrata API (`7358-krk7`); note discrepancies.
- [x] T025 Rust readiness: check `cargo`/`rustc`; if missing, attempt official rustup install and
      record the outcome. If Rust runs, benchmark TS vs Rust on the SAME workload (parse +
      normalize + dedupe, same real CSVs, same machine; time + memory, method documented).
      If Rust cannot run, record "not benchmarked in this environment" + reason. Write
      `docs/architecture/rust-readiness.md` (evaluation + benchmark + conditional recommendation).
      No Rust engine built; no microservices.
- [x] T027 Compatibility tests in `etl/tests/`: validate sample records against the JSON Schema
      from T015; version-bump tests (optional field addition does not break old records;
      breaking change requires major bump + migration note).
- [x] T028 Benchmark parity + metrics (stretch goal, NOT an acceptance gate — Sprint 01 is
      submittable without a finished benchmark; if incomplete, `rust-readiness.md` states
      pending/incomplete + reason): same CSV files (same SHA-256 checksum), same machine config
      recorded (CPU/RAM/OS/Node version/Rust version), same normalization + dedupe rules and
      output schema. Metrics: end-to-end ETL time, CPU, RAM, DB write speed, output accuracy
      (row counts + checksum + diff between the two builds, every delta explained). Any Rust
      code is a benchmark harness ONLY, clearly marked non-production, never in the production
      run path. One production engine: TypeScript.
- [x] T026 Write `etl/README.md` (how to run ETL + tests) and `etl/package.json`
      (`type: module`, zero dependencies). Deliver an evidence bundle for the dry-run report:
      commands run + outputs, files, counts.

## Phase 3 — Independent QA (US11) — worker D, after Phase 2
- [x] T030 QA reads `~/workspace/custom-skills/evidence_collector/SKILL.md` and
      `~/workspace/custom-skills/reality_checker/SKILL.md` and follows them.
- [x] T031 QA re-runs the ETL tests itself; re-verifies a sample of the 100-license cross-check
      independently; checks the repo contains no PII/secrets/CSV.
- [x] T032 QA writes `docs/reports/sprint-01-qa.md` with a PASS/FAIL verdict per deliverable.
      Default NEEDS WORK unless evidence is overwhelming.

## Phase 4 — Coordinator synthesis (me, after QA)
- [x] T040 Write `docs/reports/sprint-01-dry-run.md` (required contents per Owner assignment:
      done / not done; per-source counts with as-of dates + checksums; businesses after dedupe +
      ambiguous clusters; expired + missing-data; publishable-contact profiles; measured DB size;
      cross-check results; test results per test; remaining errors/risks; execution evidence;
      rust-readiness summary; fb434496 5-file correction note).
- [x] T041 Write `docs/reports/sprint-01-pr.md` (draft PR body: summary, what changed, how to
      verify, acceptance checklist, known gaps, rust-readiness summary).
- [x] T042 Final completion report to parent agent (done / not done, key numbers, risks,
      files created/changed). Parent does push + PR creation.
- [x] T043 Include in the final report: Rust benchmark status (complete / pending / incomplete +
      reason) and the ADR list (file + status).
