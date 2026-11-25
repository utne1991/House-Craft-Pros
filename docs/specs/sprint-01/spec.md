# Sprint 01 — Data Foundation: Spec

**Project:** House Craft Pros (Texas MVP) · **Branch:** `sprint-01/data-foundation`
**Date:** 25/11/2026 · **Status:** Owner APPROVED Sprint 00 with conditions; Sprint 01 assigned.
**Sources:** Owner assignment 25/11/2026 (Sprint 01 scope + hard rules) · Owner supplement 25/11/2026
(RUST-READY long-term architecture direction) · `docs/spec-mvp-texas-v2.md` · `docs/danh-gia-thiet-ke-2026-11-25.md`
· `~/workspace/trades-directory/research/data-findings-2026-11-24.md`.

## What this sprint is (WHAT / WHY)

Build a verifiable, long-lived, multi-state-reusable data foundation for House Craft Pros:
real Texas license data (TDLR electrical + HVAC, TSBPE plumbers) downloaded fresh from government
sources, normalized, carefully deduped, stored in PostgreSQL with full history, and validated by
a dry-run with a 100-license cross-check against the source files. No production deploy, no merge
to main, no Sprint 02 before Owner acceptance of this sprint.

Long-term architecture direction (Owner, 25/11): Next.js 16 stays for frontend/SEO. The Data
Ingestion Engine is designed to move to Rust (Tokio + SQLx) later for heavy data work — but
**this sprint still implements the ETL in TypeScript**. This sprint delivers the *interfaces and
contracts* that make a future backend swap possible without rewriting the frontend, plus an
evidence-based Rust readiness evaluation (benchmark on real data if feasible, honest "not
benchmarked" if not). No microservices, no Bee Core Engine build in this sprint.

## User stories

### US1 — Fresh government data, traceable (P1)
As the data owner, I can trace every record to the exact government file it came from, so no
number in the directory is ever unverifiable.

- **Given** the ETL runs **When** it downloads TDLR `Lteecele.csv`, `ltairref.csv` and the TSBPE
  RMP list **Then** each run records source URL, file date, row count, and SHA-256 checksum in
  `ingestion_runs`, and the raw files are kept out of the repo (local staging only).
- **Given** the download fails or the source format changed **When** the run starts **Then** it
  stops before loading, logs the failure, and changes nothing in the database.

### US2 — Normalized licenses, businesses, status (P1)
As the site, I store licenses with their own status kept separate from our confidence in the
record, so an unexpired license is never displayed as authority-confirmed.

- **Given** a TDLR CSV row (which has NO status field) **When** it is normalized **Then**
  `license_status` is set from the expiration date (active / expired / unknown) AND
  `verification_level` is set independently (`inferred` for CSV-derived status — never
  `authority-confirmed` without a status field or a .gov lookup).
- **Given** a TSBPE RMP row (which HAS a status field: Current / Expired) **When** it is
  normalized **Then** `license_status` reflects the source status and `verification_level` is
  `authority-confirmed` only for the status value itself, not for the business's identity.
- **Given** any record **When** it is displayed **Then** it never carries a "Verified" label
  unless `verification_level = authority-confirmed` with recorded evidence.

### US3 — Careful dedupe, humans decide the ambiguous cases (P1)
As the data owner, I know exactly which businesses were merged and which were held back, so no
two different businesses are silently combined.

- **Given** two licenses with the same business name AND same address or phone **When** dedupe
  runs **Then** they may merge into one business, and the merge decision is recorded.
- **Given** two licenses sharing only a name (different/ missing address and phone) **When**
  dedupe runs **Then** they are NOT auto-merged; they go to an ambiguous-clusters list for
  human review.
- **Given** the dry-run finishes **When** the report is written **Then** it states the business
  count after dedupe AND the count of ambiguous clusters held back.

### US4 — Full history: expired, disappeared, suspended, conflicting (P1)
As the data owner, I can answer "what changed, when, and why" for any license, so the Verify
tool can return expired licenses instead of "not found".

- **Given** a license present yesterday but absent from today's source **When** the run loads
  **Then** it is marked `disappeared_from_source` (not deleted) and a row is added to
  `license_status_history`.
- **Given** a license whose expiration date passed **When** the run loads **Then** its status
  becomes `expired` with history, and it remains queryable (Verify must return it as expired).
- **Given** two sources disagree about the same license **When** the run loads **Then** the
  conflict is recorded, neither value silently overwrites the other, and the record is flagged
  for review.
- **Given** a license with a suspended/revoked status in a source that carries one **When** it
  is loaded **Then** that status is stored as-is (never downgraded to `inferred` active).

### US5 — Idempotency, anomaly detection, rollback, backup (P1)
As the operator, I can re-run the pipeline safely and recover from a bad run, so a bad source
file can never corrupt the directory.

- **Given** the same source file is ingested twice **When** the second run completes **Then** no
  duplicate rows exist and no `license_status_history` rows are added for unchanged records.
- **Given** the row count jumps >10% vs the previous run, a required column is missing, or a
  field format breaks **When** the anomaly check runs **Then** publication is blocked and the
  run is reported for manual review.
- **Given** a bad run was published **When** rollback runs **Then** the database returns to the
  prior snapshot/batch.
- **Given** the database holds loaded data **When** the backup routine runs **Then** an export
  exists that restores the data (export/restore tested, not just documented).

### US6 — RLS and PII protection (P1)
As the compliance owner, I know the public can only read publishable fields, so a sole
proprietor's personal phone is not exposed by default.

- **Given** the migrations run **When** RLS is inspected **Then** public (anon) role has SELECT
  only on publishable fields, only admin roles can write, and PII columns are restricted.
- **Given** the repo is public **When** it is reviewed **Then** it contains no CSV with personal
  data, no secrets, no API keys.

### US7 — Dry-run with 100-license cross-check (P1)
As the Owner, I can verify the dry-run numbers myself from the evidence, so acceptance is based
on execution, not on claims.

- **Given** the full pipeline runs end-to-end on real data **When** the cross-check runs **Then**
  at least 100 sampled licenses, spread across the 3 trades and the statuses present in the
  real data, are verified field-by-field against their source CSV rows, with pass/fail per
  sample recorded.
- **Given** the dry-run completes **When** the report is written **Then** it reconciles totals
  against the TDLR Socrata API (dataset `7358-krk7`) as an independent count check and notes
  any discrepancy.
- **Given** no live Postgres is available **When** the dry-run uses a stand-in **Then** the
  report states plainly that the stand-in is NOT the contract: PostgreSQL is the canonical
  source, migrations target Postgres, and the stand-in gap is listed as a residual risk.

### US8 — Sprint 00 completion: AGENTS.md, doc sync, spec v2 fixes (P1)
As the Owner, I see Sprint 00 fully closed with no contradictions left between the docs, so
Sprint 01 builds on one consistent spec.

- **Given** the repo root **When** it is reviewed **Then** `AGENTS.md` exists as the operating
  manual (stack, hard rules, how to run ETL/tests, branch/PR workflow, push convention).
- **Given** README, `docs/cau-truc-site.md`, `docs/cay-bai-viet-lien-ket.md`,
  `docs/dinh-huong-2026-11-24.md` **When** compared with spec v2 **Then** no contradiction
  remains on: Next.js 14→16, $0 production claims, single publication gate, "Verified" label
  usage, single-sitemap claims. `docs/spec-mvp-texas.md` (v1, SUPERSEDED) is untouched.
- **Given** spec v2 **When** it is reviewed **Then** (a) `license_status` and
  `verification_level` are separate concepts; (b) data publication and SEO index publication
  are two separate gates; (c) the Cloudflare Pages option is replaced by an evaluation of
  Cloudflare Workers for full-stack Next.js (researched, cited); (d) the commercial hosting
  decision is required BEFORE public production, not deferred to monetization.
- **Given** commit `fb434496` **When** the push is described **Then** it is recorded as 5 files
  changed on GitHub (README + 4 docs), not 16 — the other 11 manifest paths were
  byte-identical to HEAD. AGENTS.md records the push convention: report CHANGED files, not
  manifest paths.

### US9 — Backend-swappable contracts + reusable Data Engine design (P1)
As the architect, I can replace the ETL/backend later without rewriting the frontend, and reuse
the engine for other Bee-ecosystem sites, so today's TypeScript ETL is not a dead end.

- **Given** the architecture docs **When** reviewed **Then** `docs/architecture/data-model.md`
  and `docs/architecture/etl-pipeline.md` define explicitly: source adapter interface,
  normalized record schema, loader interface, and DB contract.
- **Given** the ETL code **When** inspected **Then** it imports nothing from Next.js, depends
  on no frontend framework, and is configured per source/state/trade (no House Craft Pros
  values hardcoded in engine logic).
- **Given** PostgreSQL vs any stand-in **When** documented **Then** PostgreSQL is named the
  canonical source and the stand-in is labeled as stand-in only.
- **Given** `etl-pipeline.md` **When** reviewed **Then** it lists the reuse points for the Bee
  ecosystem (config-driven design) — and stops there: no Bee Core Engine is built in this
  sprint.

### US10 — Rust readiness evaluation with evidence (P2 — STRETCH GOAL, not an acceptance gate)
As the Owner, I decide on Rust based on measured evidence, not on "Rust is faster" claims.
The benchmark is a stretch goal: Sprint 01 is submittable for acceptance when the TS ETL +
dry-run + tests + QA are done, even if the Rust benchmark is incomplete — in that case
`rust-readiness.md` states the benchmark is pending/incomplete with the reason.

- **Given** the VM **When** checked **Then** the report states whether `cargo`/`rustc` are
  available; if not, whether official rustup install was attempted and its outcome.
- **Given** Rust is runnable **When** the benchmark runs **Then** TypeScript and Rust run the
  SAME workload under BENCHMARK PARITY: same data (same CSV files, same SHA-256 checksum),
  same machine config (CPU/RAM/OS/Node version/Rust version recorded), same processing rules
  (same normalization + dedupe rules, same output schema). All three parity facts are written
  into the benchmark report — without parity the result is worthless.
- **Given** the benchmark runs **When** results are recorded **Then** it measures: end-to-end
  ETL time, CPU, RAM, database write speed, AND output accuracy (row counts + checksum +
  diff of outputs between the two builds; every delta explained).
- **Given** Rust cannot be installed/run **When** the report is written **Then** it states
  "Rust not benchmarked in this environment" with the reason — no conclusion by speculation.
- **Given** the benchmark shows TypeScript is good enough at ~44k licenses **When** the
  recommendation is written **Then** it says so explicitly; if Rust wins on a workload, it
  gives the numbers and the conditions.
- **Given** the scope **When** reviewed **Then** `rust-readiness.md` is evaluation + interface
  design only — no Rust engine is built in this sprint, no microservices, no Bee Core Engine.
- **Given** any Rust code exists **When** reviewed **Then** it is a benchmark harness ONLY,
  clearly marked non-production, and NOT in the production run path. There is exactly ONE
  production ETL engine: TypeScript.

### US12 — Language-independent, versioned data contract with compatibility tests (P1)
As the architect, I can reimplement the ETL in any language against the same contract, so the
contract — not the TypeScript types — is the source of truth.

- **Given** `docs/architecture/data-contract.md` + `etl/contract/` **When** reviewed **Then**
  the normalized record is defined by JSON Schema and the Postgres shape by SQL DDL as the
  canonical sources; the contract carries a version (v1); the version is written into each
  record/metadata and into `ingestion_runs` (`contract_version`).
- **Given** the compatibility tests **When** run **Then** they validate sample records against
  the JSON Schema, and test version bumps: adding an optional field does not break old
  records; a breaking change requires a major version bump + a migration note.
- **Given** a future reimplementation **When** it starts **Then** it reads the JSON Schema +
  DDL, not the TypeScript types.

### US13 — Architecture Decision Records (P1)
As the Owner, I can see every technology decision with its context and consequences, so
acceptance includes the reasoning, not just the artifacts.

- **Given** `docs/architecture/decisions/` **When** reviewed **Then** it contains at minimum:
  ADR ETL language (TS now, Rust-ready), ADR Postgres as canonical source, ADR hosting
  decision timing (decide before public production), ADR Cloudflare Workers evaluation vs
  Vercel Pro (per the actual evaluation results). Format: Context / Decision / Consequences /
  Status. Status is "proposed" until Owner accepts the PR, then "accepted".

### US11 — Independent QA verdict (P1)
As the Owner, I get a QA verdict from someone who did not build the work, so "done" means
independently checked.

- **Given** all deliverables **When** QA reviews **Then** QA re-runs the tests itself,
  re-verifies a sample of the cross-check, and gives a PASS/FAIL verdict per deliverable in
  `docs/reports/sprint-01-qa.md`. Default verdict is NEEDS WORK unless evidence is overwhelming.

## Out of scope (explicitly NOT in this sprint)
- Next.js frontend, Verify tool UI, guides, sitemap, SEO pages (Sprints 02–03).
- Building a Rust ETL engine, microservices, Bee Core Engine.
- A second production ETL engine running in parallel with TypeScript — one production engine only.
- Production deploy, merge to main, any cloud resource creation, any spending.
- California/Florida data.

## [NEEDS CLARIFICATION]
- TSBPE RMP download: the exact current download URL/format must be extracted from
  `~/workspace/trades-directory/research/tsbpe_list.html` at implementation time; if the page
  no longer exposes a direct CSV link, the implementer must record the fallback method used
  and its as-of date rather than guessing a URL.
- Whether `sudo apt install postgresql` succeeds in this VM is unknown until attempted; the
  dry-run report must record the attempt and its outcome.
- Whether `cargo`/`rustc` exist or rustup install succeeds in this VM is unknown until
  attempted; the rust-readiness report must record the attempt and its outcome.
