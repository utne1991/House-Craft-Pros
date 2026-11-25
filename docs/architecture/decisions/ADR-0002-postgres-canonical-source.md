# ADR-0002 — PostgreSQL is the canonical source; stand-ins are stand-ins

**Status:** proposed
**Date:** 25/11/2026
**Sprint:** 01 — Data Foundation

## Context

Sprint 01 needs a database to load ~44,980 Texas license rows into, with
history, dedupe decisions, publication gates, and row-level security. Two
realities collide:
- The production database is PostgreSQL via Supabase (spec v2 §3). Supabase
  Free has limits (500 MB, pauses after 7 days of inactivity, no automatic
  backups) and no credentials exist in this sprint, so no cloud database is
  created in Sprint 01 ($0 rule).
- The dry-run (Sprint 01 US7) needs a database to execute against. The sprint
  plan allows a stand-in (`node:sqlite`) if no local Postgres can be run —
  but a stand-in must never be mistaken for the contract.

The decision needed: which database is the authority that migrations,
contracts, and tests target, and what status any stand-in has.

## Decision

1. **PostgreSQL is the canonical source.** All migrations
   (`db/migrations/*.sql`) are written in PostgreSQL dialect, all constraints
   (including `NULLS NOT DISTINCT` unique constraints and CHECK constraints
   such as `licenses_inferred_rule`) are PostgreSQL features, and the DB
   contract (public views, RLS policies) is defined against PostgreSQL.
2. **A stand-in is a stand-in, never the contract.** If a dry-run uses
   SQLite (or any other engine) because no local Postgres is available, the
   dry-run report MUST state plainly: the stand-in is NOT the contract,
   migrations target Postgres, and the gap (migrations validated by review +
   logic tests only, not by live Postgres execution) is listed as a residual
   risk (Sprint 01 spec US7).
3. **Local Postgres is preferred whenever it can be run.** In this sprint it
   could: PostgreSQL 16.15 was installed from Ubuntu packages and the
   migrations were executed against a real local cluster (see
   `docs/architecture/data-model.md` §9 for the exact outcome) — so Sprint
   01's schema carries NO stand-in gap. If a future environment cannot run
   Postgres, rule 2 applies.
4. **Production mapping:** Supabase = PostgreSQL. The local roles
   (`app_anon`, `app_admin`) map to Supabase `anon` / `service_role`; the
   same DDL applies. Supabase-specific behavior (dashboard-managed admin
   user, pausing on Free tier) is an operational note, not a schema change —
   the schema never depends on a Supabase-only extension (the one clearly
   marked optional section in migration 0005 is documentation only).

## Consequences

- **Positive:** one authority for the schema — no drift between "the SQLite
  version" and "the Postgres version". Migrations are executable and were
  executed (6/6 OK on first run and on re-run, 11/11 verification checks
  pass — `data-model.md` §9).
- **Positive:** the frontend contract (public views) is a Postgres contract;
  the Sprint 02+ frontend can rely on view columns, RLS behavior, and
  constraint guarantees that a stand-in could not promise.
- **Negative / cost:** a developer environment without Postgres cannot run
  the migrations — it must install it (one `apt-get install` on Ubuntu) or
  accept the documented stand-in gap. This is a deliberate cost: a silent
  stand-in would be worse than an explicit one.
- **Risk:** Supabase Free quirks (pausing, 500 MB) are not covered by the
  local install. Mitigated by the ETL export/backup requirement
  (`etl-pipeline.md` §5) and by the commercial-hosting decision the Owner
  must make before public production (spec v2 §2).

## Status

**Proposed.** Becomes `accepted` only when the Owner accepts the Sprint 01 PR.
