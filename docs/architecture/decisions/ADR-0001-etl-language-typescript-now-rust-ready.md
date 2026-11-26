# ADR-0001 — ETL in TypeScript now, designed for a future Rust backend

**Status:** accepted (25/11/2026)
**Date:** 25/11/2026
**Sprint:** 01 — Data Foundation

## Context

House Craft Pros needs a Data Ingestion Engine that downloads Texas government
license CSVs (TDLR electrical + HVAC, TSBPE plumbers — ~44,980 rows in the
24/11/2026 files), normalizes them, dedupes businesses, loads them into
PostgreSQL with full history, and validates the result with a dry-run. The
Owner's long-term direction (25/11/2026 supplement) is that the engine moves
to Rust (Tokio + SQLx) later for heavy data work, because Rust is the better
fit for sustained, high-volume ingestion — but the Owner also scoped Sprint 01
explicitly: the ETL is implemented in TypeScript in this sprint, and no Rust
engine is built now.

Constraints on the decision:
- The team (and the VM) already runs TypeScript/Node 24; the ETL must be
  runnable with plain `node`, zero dependencies (Sprint 01 plan).
- The dataset is ~45k rows — small enough that implementation language is
  unlikely to be the bottleneck (to be measured, not assumed — see
  `docs/architecture/rust-readiness.md`, Sprint 01 US10).
- The frontend is Next.js 16 + TypeScript; the ETL must not import anything
  from Next.js.
- A future language swap must not force a frontend rewrite.

## Decision

1. **Sprint 01 implements the ETL in TypeScript** (zero dependencies, Node 24,
   erasable syntax only), in `etl/` as a separate package with its own
   `package.json` (`type: module`) and README.
2. **The engine is designed from day one so the backend can be swapped
   without rewriting the frontend.** The swap points are contracts, not code:
   - the normalized record is defined by a **language-independent JSON Schema**
     (`etl/contract/normalized-record.v1.json`) + **SQL DDL**
     (`db/migrations/`) as the canonical sources — TypeScript types are
     derived from them, never the standard (`docs/architecture/
     data-contract.md`);
   - the **source adapter interface**, **loader interface**, and **DB
     contract** (public views only) are written down in
     `docs/architecture/data-model.md` §6 and `data-contract.md` §§3–5;
   - the **normalize step is a pure function** (row, config, file date) with
     no network, no DB, and no global state, so it ports mechanically to any
     language;
   - the engine is **config-driven per source/state/trade** (no House Craft
     Pros values hardcoded in engine logic — `etl-pipeline.md` §6), so a new
     backend implements the same stages against the same config shape.
3. **Rust is a long-term direction, not a decision made in this sprint.**
   Whether and when to switch is decided by the Owner based on evidence —
   specifically the Rust-readiness evaluation in this sprint (same workload,
   same machine, real CSVs, time + memory), not on "Rust is faster" claims.
   If the benchmark shows TypeScript is good enough at ~44k licenses, the
   recommendation says so explicitly.
4. **No microservices, no Bee Core Engine in this sprint.** The reuse design
   (config-driven engine, versioned contract) is the deliverable; extracting
   a shared engine is a later, separately approved decision.

## Consequences

- **Positive:** Sprint 01 ships in the stack the team already runs; the
  contract-first design means a Rust rewrite later reuses the schema, the
  DDL, the stage contracts, and the tests' expectations instead of
  rediscovering them; the frontend is insulated (it reads only the public
  views + the contract).
- **Positive:** the decision is reversible at low cost — the swap surface is
  enumerated (adapter interface, loader interface, DB contract), so a future
  Rust implementation has a checklist, not a archaeology project.
- **Negative / risk:** TypeScript may prove slow if the dataset grows by 10–
  100× (more states, more trades) — mitigated by the benchmark in this
  sprint and by the fact that the swap path is designed, not improvised.
- **Negative / risk:** maintaining the contract (JSON Schema + DDL + docs)
  costs discipline: every change must land in the machine-readable sources
  first. Mitigated by the versioning rules (`data-contract.md` §7) and the
  compatibility tests the ETL worker writes.
- **If the Owner later chooses Rust:** the TypeScript ETL becomes the
  reference implementation the Rust port is tested against (same inputs →
  same normalized records → same DB state), which is a stronger position
  than a from-scratch rewrite.

## Status

**Accepted 25/11/2026.** Condition met: the Owner accepted Sprint 01 PR #1 (merged 25/11/2026, commit 33fda85e, by Owner decision). Flipped to accepted in Sprint 02.
