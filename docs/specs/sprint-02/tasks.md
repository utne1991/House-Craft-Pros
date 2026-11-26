# Sprint 02 — tasks

**Branch:** `sprint-02/lookup-and-review` · **Date:** 25/11/2026

## Done

- [x] **T1 — Postgres 16 reinstall + DB rebuild.** `postgresql-16` 16.15
  installed via apt (Ubuntu 24.04), cluster `16 main` started, DB
  `housecraftpros` recreated, migrations 0001–0006 applied 6/6. Fresh
  downloads 25/11/2026 → 43,980 licenses (elec 14,067 / HVAC 20,500 /
  RMP 9,413), 43,840 businesses. `verify.ts` 13/13, cross-check 100/100,
  backup/restore 14/14. See `docs/reports/sprint-02-report.md` §2.
- [x] **T2 — Flip 4 ADRs to accepted.** ADR-0001/0002 (condition met: Owner
  accepted Sprint 01 PR #1, merged 25/11, commit 33fda85e);
  ADR-0003/0004 (basis: Owner approved spec v2, conditional GO 24/11, and
  authorised Sprint 01 + Sprint 02). Each file records its basis + the
  remaining caveat (ADR-0003 accepts the *rule*, not a host choice;
  ADR-0004 stays a conditional recommendation — no trial deploy).
- [x] **T3 — F5 / R-10: log cross-source reuse merges.** `sqlgen.ts` inserts
  one `dedupe_decisions` row per reuse (57 rows in the rebuild); the 58th
  multi-source business (GTG AUTOMATION INC) is covered by its extended
  in-run decision (guard case). Two DB tests (reuse + guard). Also fixed
  two bugs the new tests exposed: empty `dedupe.tsv` broke COPY; a re-run
  of a new file version inserted an orphan business row (new `verify.ts`
  check: no orphan businesses).
- [x] **T4 — Review workflow for held clusters.** `review.ts` +
  `review-cli.ts` (`--list` / `--show` / `--decide`, plan by default,
  `--confirm` + `--by` to execute). 7 tests. Live queue measured: **965
  clusters / 2,348 licenses** awaiting review — see
  `docs/reports/sprint-02-review-queue.md`. **No real cluster was decided.**
- [x] **T5 — License lookup (local).** `lookup.ts` + `lookup-cli.ts`
  (read-only) + `docs/specs/sprint-02/verify-contract.md`. Acceptance
  cases in `tests/lookup.test.ts` (7 tests): active / expired / suspended
  (synthetic row) / not found / duplicate name / inferred note / trade
  filter. Smoke-tested on the rebuilt DB.
- [x] **T6 — Contractor Records deep profile (carried over).** Previous
  coordinator's file added to `research/` (public-web research, no PII).
  Finding: clear field in San Antonio / Dallas / Houston (counts-only or
  absent); Austin is their stronghold.
- [x] **Tests: 84/84 pass** (68 Sprint 01 + 16 new). `npm test` from `etl/`.

## Not done / explicitly deferred

- [ ] **First live ETL load** — needs Owner / anh Út approval of the
  dry-run numbers (AGENTS.md §4). The rebuilt DB is local-only.
- [ ] **Human review of the 965 held clusters** — needs a human reviewer
  with `--by` + `--confirm`. The workflow is built and tested; the
  decisions are not the worker's to make.
- [ ] **Push + PR creation** — worker never touches GitHub (AGENTS.md §6).
  Branch `sprint-02/lookup-and-review` is ready; the parent agent pushes
  and opens the PR.
- [ ] **Next.js `/verify/` route** — Sprint 03, from
  `docs/specs/sprint-02/verify-contract.md`.
- [ ] **Suspended-license test on real data** — no suspended license exists
  in the sources; covered by a synthetic row in the scratch DB only.
