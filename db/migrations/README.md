# db/migrations/ — House Craft Pros (Sprint 01)

PostgreSQL 16 migrations. **PostgreSQL is the canonical source** (ADR-0002):
these files are the authority for the persisted shape, alongside the JSON
Schema in `etl/contract/`.

## Files (apply in order)

| File | Contents |
|---|---|
| `0001_roles_functions.sql` | Roles `app_anon` (public) / `app_admin` (server-side) + `set_updated_at()` trigger function |
| `0002_reference_data.sql` | `data_sources`, `locations`, `license_holders`, `ingestion_runs` (incl. `contract_version`) |
| `0003_core.sql` | `businesses`, `licenses` (incl. the `license_status` / `verification_level` split + both publication-gate timestamps), `license_status_history` |
| `0004_workflow.sql` | `claims`, `correction_requests`, `publication_batches`, `publication_batch_items` (proposed), `audit_logs`, `dedupe_decisions` (proposed), `source_conflicts` (proposed) |
| `0005_rls_views.sql` | RLS on all 14 tables + public views `v_public_businesses`, `v_public_licenses`, `v_seo_indexable_licenses` + grants |
| `0006_seed_sources.sql` | Seed: 3 `data_sources` rows (TDLR electrical, TDLR HVAC, TSBPE RMP) |

Total: **14 tables, 3 views, 29 CHECK constraints.** Every file has a header
with its purpose and a ROLLBACK (down) note. Every file is **idempotent**
(safe to re-run).

## How to run (local Postgres)

```bash
# 1. Install + start (Ubuntu 24.04; $0, no Docker, no cloud)
apt-get install -y postgresql postgresql-client
pg_ctlcluster 16 main start

# 2. Create the dev database (name is local-only; production is Supabase)
su postgres -c "psql -c 'CREATE DATABASE housecraftpros;'"

# 3. Apply in order (ON_ERROR_STOP=1: stop on the first error)
for f in db/migrations/000*.sql; do
  su postgres -c "psql -v ON_ERROR_STOP=1 -d housecraftpros -q -f $PWD/$f"
done
```

Quirk (25/11/2026): the `postgres` OS user cannot read `/home/hatch` (home-dir
permissions), so for a `psql -f` run copy the files somewhere readable first
(e.g. `cp -r db/migrations /tmp/hcp-migrations`) — the repo files remain the
source of truth.

## Validation performed (T013, 25/11/2026)

- **Environment:** Ubuntu 24.04.5 LTS, PostgreSQL **16.15** (Ubuntu
  `noble-updates`), local cluster on port 5432, dev database `housecraftpros`.
  Install + cluster start took ~65 s. No Docker, no cloud, $0.
- **Result: 6/6 migrations OK on first run, 6/6 OK on re-run (idempotent).**
  Two bugs were found and fixed during execution (both in the migration
  files): `NULLS NOT DISTINCT` is not valid in `CREATE UNIQUE INDEX` (moved
  to a UNIQUE constraint), and two `COMMENT ON` strings began with a
  single-quoted word (reworded).
- **Verification (synthetic data only, removed afterwards): 11/11 checks
  PASS** — inferred-rule rejection, valid inferred insert, duplicate-identity
  rejection, unpublished hidden from the public view, data-published visible,
  SEO gate independent, withheld phone NULL in the view, duplicate-checksum
  run rejected, malformed checksum rejected, duplicate county-level location
  rejected, anon denied on base tables but able to SELECT the views.
  Final state: 0 businesses / 0 licenses / 0 runs / 3 seed sources;
  DB size ~9.3 MB (empty schema). Full detail:
  `docs/architecture/data-model.md` §9.
- **Residual risk:** LOW for the schema — it is proven against real
  PostgreSQL 16.15, not just review. The remaining risk is the ETL/dry-run
  (Phase 2), not these migrations. Production runs on Supabase (PostgreSQL):
  same DDL; roles map to `anon` / `service_role`.

## Rules for future migrations

- New migration = new numbered file (`0007_*.sql`, …). Never edit an applied
  migration in place after a sprint accepts it.
- Keep the header (purpose + ROLLBACK note) and the idempotency guards
  (`IF NOT EXISTS`, `DO` blocks, `DROP ... IF EXISTS`).
- `contract_version` bumps follow `docs/architecture/data-contract.md` §7
  (breaking change = new major version + new schema file + migration).
- No PII, no secrets, no CSV data in migration files — the repo is public.
