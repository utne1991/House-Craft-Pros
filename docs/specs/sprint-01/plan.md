# Sprint 01 — Data Foundation: Plan

**Date:** 25/11/2026 · **Spec:** `docs/specs/sprint-01/spec.md` (gate: Owner assignment 25/11
is the spec authority; this plan implements it).

## Approach
1. **Sprint 00 completion first** (US8): AGENTS.md + doc sync + spec v2 fixes. No separate
   sprint for doc fixes. One worker, no code dependencies.
2. **Data model + migrations** (US2/US4/US6/US9): ERD, data dictionary, 11-table Postgres
   migrations with RLS. Design the split columns (`license_status` vs `verification_level`)
   and the two publication gates (data vs SEO-index) into the schema from the start.
3. **ETL in TypeScript, zero dependencies, Node 24** (US1–US5, US9): `etl/` with
   download → parse → normalize → dedupe → load → verify stages, `node:test` tests, runnable
   with plain `node` (erasable-syntax TS only — no enums/namespaces/parameter properties).
   Fully independent of Next.js; config-driven per source/state/trade.
4. **Dry-run on real data** (US7): fresh download first, Nov-24 local copies only as fallback
   (state as-of date if used). 100-sample cross-check + Socrata reconciliation.
5. **Rust readiness evaluation** (US10): check toolchain, attempt rustup if missing, benchmark
   same workload both sides if feasible; honest "not benchmarked" otherwise.
6. **Independent QA** (US11): separate worker, re-runs tests, re-verifies cross-check sample,
   per-deliverable PASS/FAIL. Default NEEDS WORK.
7. Coordinator (me) writes the dry-run report and PR draft from execution evidence, then hands
   everything to the parent agent for push + PR creation. No GitHub operations by any worker.

## Key decisions
- **PostgreSQL is the canonical source.** Migrations target Postgres. If no local Postgres can
  be run, dry-run logic is validated on `node:sqlite` as a stand-in, and the gap is documented
  as a residual risk — migrations are then validated by review + SQLite logic tests, not by live
  Postgres execution.
- **Split columns, not split tables:** `licenses.license_status` (active/expired/suspended/
  revoked/unknown) and `licenses.verification_level` (authority-confirmed/inferred/unverified)
  are separate columns on the same row — the split is a modeling fact, not a join.
- **Two publication gates as separate fields:** `publication_batches` gains
  `data_published_at` and `seo_index_published_at` (a record can be data-published without
  being SEO-published). Batch membership stays in `publication_batches`; per-record gate state
  lives on the license/business rows so a single record's two gates can differ. (If the
  implementer finds a cleaner equivalent, document the choice and why.)
- **Dedupe is conservative:** merge only on name + address/phone evidence; name-only clusters
  go to a human-review list, never auto-merged.
- **ETL is a separate package:** `etl/package.json` (`type: module`, zero deps), its own README,
  no imports from any frontend code. Configuration (sources, states, trades) lives in config,
  not in engine code — this is what makes the engine reusable for other Bee sites.
- **Contracts before code:** source adapter interface, normalized record schema, loader
  interface, DB contract are written into `data-model.md` / `etl-pipeline.md` before the ETL
  is considered complete; the ETL must implement them, not just describe them.
- **Language-independent contract:** JSON Schema (normalized record) + SQL DDL (Postgres)
  are the canonical contract sources, versioned (v1), with the version recorded on records
  and in `ingestion_runs`; compatibility tests prove old records still validate and breaking
  changes bump major.
- **Rust evaluation is measurement, not advocacy:** same workload, same machine, real CSVs,
  time + memory. If TS is good enough at ~44k rows, the recommendation says so.
- **Benchmark parity is mandatory for any benchmark claim:** same CSV files (same SHA-256),
  same machine config recorded, same normalization/dedupe rules and output schema; metrics
  include end-to-end time, CPU, RAM, DB write speed, and output accuracy (row counts +
  checksum + diff, every delta explained). No parity → no conclusion.
- **Benchmark is a stretch goal, not a gate:** Sprint 01 is submittable when TS ETL +
  dry-run + tests + QA are done, even if the Rust benchmark is pending/incomplete (recorded
  honestly in `rust-readiness.md`).
- **One production engine only:** TypeScript. Any Rust code is a non-production benchmark
  harness, clearly marked, never in the production path.
- **ADRs for every technology decision:** Context / Decision / Consequences / Status;
  status "proposed" until Owner accepts the PR.

## Deliberately rejected
- **Building the Rust engine now** — Owner explicitly scoped rust-readiness.md to evaluation +
  interface design; TS stays the Sprint 01 implementation.
- **Microservices / Bee Core Engine in this sprint** — out of scope per Owner supplement.
- **Cloud resources (new Supabase project, hosted Postgres)** — $0 rule; no credentials exist.
- **Scraping competitor sites or using Socrata as directory source** — Socrata has only 9
  fields (no phone/address/city/status); directory data comes from CSVs only.
- **Filtering expired licenses out before load** — v1 mistake; expired licenses must load and
  remain queryable (Verify returns them as expired).
- **Auto-merging businesses on name alone** — insufficient evidence; held for human review.
- **Cloudflare Pages as the $0 production option** — replaced per Owner direction by an
  evaluation of Cloudflare Workers (OpenNext) vs Vercel Pro $20/mo.

## Constitution check (inviolable for this sprint)
1. No fabricated data — every number traces to a source file + checksum.
2. No "Verified" label without authority-confirmed evidence.
3. No PII/secrets/CSV in the repo (public).
4. $0 — no cost without Owner approval.
5. No production deploy, no merge to main, no Sprint 02 before Sprint 01 acceptance.
6. Test-first: tests written before/with implementation; every claim in reports cites
   execution evidence (command output, file, test run).
7. QA independent from execution; default verdict NEEDS WORK.
8. If a requirement cannot be met, say so explicitly with reason + residual risk — never paper
   over it.
