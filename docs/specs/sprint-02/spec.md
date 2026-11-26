# Sprint 02 — License Verification Tool (spec)

**Date:** 25/11/2026 · **Branch:** `sprint-02/lookup-and-review` · **Status:** work
complete, PR prepared for acceptance (no merge, no deploy).
**Spec hiện hành:** `docs/spec-mvp-texas-v2.md` §5 (verify 3 trạng thái), §6.1
(tool `/verify/`), §7 (Sprint 02 row).

## 1. Goal

A homeowner can look up a Texas contractor's real license — by license
number or by business name — against the rebuilt local database, and get an
answer that never over-claims: `license_status` and `verification_level`
are always shown separately, nothing is labelled "Verified" without
authority confirmation, an expired license is returned as expired (never
as "not found"), and a name matching several businesses returns all of
them for disambiguation.

## 2. Scope (5 items + 1 carried-over research item)

| # | Item | Deliverable |
|---|---|---|
| 1 | Reinstall Postgres 16 + rebuild the local DB | Fresh downloads 25/11/2026, full ETL load, verify 13/13, cross-check 100/100, backup/restore 14/14 — see `docs/reports/sprint-02-report.md` |
| 2 | Flip the 4 ADRs to accepted | ADR-0001…0004 `Status: accepted (25/11/2026)` with the acceptance basis recorded in each file |
| 3 | F5 / R-10: log the 58 cross-source reuse merges | `etl/src/sqlgen.ts` logs each reuse as a `dedupe_decisions` row; guard case (reuse + in-run merge of the same cluster) extends the in-run decision's `license_ids` |
| 4 | Review workflow for the held clusters | `etl/src/review.ts` + `etl/src/review-cli.ts`: `--list` / `--show` / `--decide merge|keep-separate` (plan by default, `--confirm` executes; `--by` required). No real cluster was decided in this sprint — human review is pending |
| 5 | License lookup, local (API + CLI + `/verify/` contract) | `etl/src/lookup.ts` + `etl/src/lookup-cli.ts` (read-only, local Postgres only) + `docs/specs/sprint-02/verify-contract.md` |
| 6 | Contractor Records deep profile (carried over — done by the previous coordinator 25/11) | `research/contractor-records-deep-profile-2026-11-25.md` (added to the repo in this branch; public-web research only, no PII) |

## 3. Acceptance criteria (spec v2 §7: test active / expired / suspended / not found / duplicate name)

| Case | How it is tested | Result |
|---|---|---|
| Active | `lookupByLicense("plumbing", "1001")` → active / authority-confirmed | `tests/lookup.test.ts` ✔ |
| Expired | `lookupByLicense("plumbing", "1003")` → expired / authority-confirmed, returned (not "not found") | ✔ |
| Suspended | No suspended license exists in any source file — tested with a clearly-labelled synthetic row in the scratch DB only | ✔ (mapping passes the status through) |
| Not found | License `99999` → `found:false` + `.gov` guidance, never a fabricated result | ✔ |
| Duplicate name | `lookupByName("SMITH PLUMBING LLC")` → `ambiguous:true`, all matching businesses | ✔ |
| Inferred (TDLR) | Electrical license → active / inferred + display note "not yet confirmed against a live .gov lookup" | ✔ |
| Lookup CLI on real data | `--license 17000` (active), `--license 17019` (expired), `--license 99999` (not found), `--name TDINDUSTRIES INC` (ambiguous, 22 businesses) | ✔ (smoke-tested 25/11) |

## 4. Hard rules (unchanged from Sprint 01)

- Local only: no deploy, no merge to `main`, no GitHub operations by the
  worker (AGENTS.md §6). The branch is prepared for a PR; the parent agent
  pushes/creates it.
- $0. No spending, no cloud database — the DB is the local VM Postgres.
- No fabricated data; no PII / secrets / CSV in the public repo.
- Never label anything "Verified" without authority confirmation
  (spec v2 §5).
- Held clusters are decided by a HUMAN only (`--by` required, `--confirm`
  required to execute). The tool never decides alone.
- Every claim cites execution evidence (command output, file, test run).

## 5. What is NOT in this sprint

- No Next.js app, no HTTP server, no `/verify/` web route — the contract
  (`verify-contract.md`) is the handoff for Sprint 03.
- No first live ETL load (still needs Owner / anh Út approval of the
  dry-run numbers — AGENTS.md §4).
- No decisions on the 965 held clusters awaiting review (see
  `docs/reports/sprint-02-review-queue.md`).
- No permit-history enrichment (Contractor Records implication #2 — Phase 2,
  after MVP).
- No Rust work (ADR-0001: TypeScript stays the reference implementation).

## 6. Files

- `etl/src/lookup.ts`, `etl/src/lookup-cli.ts` — Verify data layer + CLI
- `etl/src/review.ts`, `etl/src/review-cli.ts` — held-cluster review workflow
- `etl/src/sqlgen.ts` — R-10 reuse logging, orphan-business fix, empty-TSV fix
- `etl/src/verify.ts` — 13th check: no orphan businesses
- `etl/tests/lookup.test.ts`, `etl/tests/review.test.ts`,
  `etl/tests/fixtures/{elec-reuse,elec-reuse-guard,rmp-held-merge}.csv`
- `docs/architecture/etl-pipeline.md` §8 — R-10 marked resolved
- `docs/architecture/decisions/ADR-000{1..4}-*.md` — accepted 25/11/2026
- `research/contractor-records-deep-profile-2026-11-25.md`
- `docs/reports/sprint-02-report.md`, `docs/reports/sprint-02-review-queue.md`
