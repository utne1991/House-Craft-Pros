# House Craft Pros — ETL (Sprint 01, Data Foundation)

TypeScript ETL, **zero dependencies**, plain Node 24 (erasable-syntax
TypeScript only: no enums, namespaces, or parameter properties). No imports
from Next.js or any frontend code. Config-driven per source/trade — no
House Craft Pros values are hardcoded in the engine logic.

Stages: **download → parse → normalize → dedupe → load → verify.**

## Run

```bash
node --version          # must be 24.x (checked: v24.22.1 on the VM, 25/11/2026)
cd etl
node src/run.ts --all                    # all 3 sources, in order
node src/run.ts --source tdlr-electrical # one source
node src/run.ts --source tsbpe-rmp --file /path/to/rmp_download  # local file fallback
node src/verify.ts                       # 13 post-load checks
node src/crosscheck.ts                   # 100-sample field-by-field cross-check
node src/backup.ts                       # pg_dump -Fc + restore verification
npm test                                 # full test suite: 84 tests (see below)
node src/lookup-cli.ts --license 1001 --trade plumbing   # look up one license (read-only)
node src/lookup-cli.ts --name "SMITH PLUMBING LLC"       # look up by business name
node src/review-cli.ts --list [--limit 50]                # held clusters awaiting human review
node src/review-cli.ts --decide "held merge llc" --decision merge --by owner [--confirm]
```

The driver writes per-source staging under `/tmp/hcp-etl/` (downloaded CSVs,
`run.sql` + COPY TSVs, `run-summary.json`). Raw CSVs **never** go into the
repo — they contain real licensee phones.

## How loading into Postgres works (no driver)

The ETL is zero-dependency, so it has no Postgres driver. Loading works in
two steps:

1. `src/sqlgen.ts` generates, per source, one `run.sql` (a single transaction:
   holders/locations find-or-create, business reuse by name+phone/address
   evidence, upsert by `(source_id, license_type, license_number)`, history
   rows on change only, disappeared-from-source rows kept with
   `status_changed_at` — never deleted) plus COPY TSV data files.
2. `src/pg.ts` applies them with the local `psql` binary via `su postgres -c
   "psql -d housecraftpros ..."`. Database name is overridable with the
   `HCP_DB` environment variable (tests use a scratch DB).

## Two environment quirks (documented, not worked around silently)

- **The `postgres` OS user cannot read `/home/hatch`.** Every file psql must
  read is staged under `/tmp/hcp-etl/` (working dir `/tmp/hcp-etl`).
- **Shell umask is `0007`**, so directories created by root are group-only.
  The driver chmods staging dirs to 755 and files to 644 before invoking psql.

## Idempotency

Each source file's SHA-256 is recorded in `ingestion_runs` with a UNIQUE
`(source_id, sha256_checksum)` index. Re-running the same file is a no-op:
the driver reports `duplicate_noop` ("duplicate of run <id>") and loads
nothing — it does **not** create a second run row. (The pipeline doc §D5
literally says a re-run marks a new run `succeeded`; the UNIQUE index makes
that impossible, so the no-op is the implemented behaviour.)

On retry after a **failed** run, the driver reuses the same run row id
(`createOrReuseRunRow`), so a failed run does not leave orphan run rows.

## Dedupe (conservative)

Merge only on **name + phone/address evidence**. Name-only clusters are
held for human review (`held_ambiguous`); same-name clusters with
conflicting evidence are rejected (`rejected_no_merge`). A cluster that
splits into groups merges each evidenced subgroup and holds the rest —
never the whole cluster. Every decision is recorded in `dedupe_decisions`.

Note: the in-run dedupe partitions 43,976 licenses into 43,895 businesses;
the loader's cross-source business reuse (same evidence rule) merges a
further 58, so the database holds 43,837 businesses after the dry-run.

**Sprint 02 (R-10):** every reuse merge is now logged as a `dedupe_decisions`
row (decision `merged`, rationale `cross-source reuse from <source> ...`,
`license_ids` = all licenses now in the business) — see `sqlgen.ts` and
`docs/architecture/etl-pipeline.md` §8. The one case with no separate reuse
row is a cluster already merged in-run this run: the loader extends that
decision's `license_ids` to the whole business instead. The Sprint 02
rebuild logs 57 reuse rows; the 58th multi-source business (GTG AUTOMATION
INC) is covered by its extended in-run decision. Also fixed in Sprint 02:
re-running a new file version no longer inserts an orphan business row for
licenses that already exist (verified by a new `verify.ts` check, "no orphan
businesses"), and an empty `dedupe.tsv` (a run with zero dedupe decisions)
no longer breaks the COPY load.

## Status / verification split

- TDLR rows have **no status field**: `license_status` is inferred from the
  expiration date, `verification_level='inferred'`.
- TSBPE RMP rows use their source status field (`LIC_STATUS` Current →
  active, Expired → expired); the status value itself is
  `authority-confirmed`, the rest of the record is not.

## Load-time defaults (recorded, not hidden)

- `businesses.state_code` is NOT NULL, so a missing source state defaults
  to `'TX'` (the Texas source file); the normalized record keeps state NULL.
- A missing business name falls back to the holder name; each fallback is
  recorded in `audit_logs` (`business.name_fallback`).

## Open items resolved (etl-pipeline.md §8)

- **O-1 — TDLR `COUNTY` vs `BUSINESS COUNTY`:** they disagree materially
  (electrical 908/14,066 = 6.46%; HVAC 4,977/20,498 = 24.28%). Per contract
  v1 only `BUSINESS COUNTY` is used; the disagreement is reported, the rule
  is not switched silently.
- **O-2 — "last good run" pointer:** query the latest `succeeded` run per
  source; no pointer column added.
- **O-3 — stale-`running` threshold:** 24 h (in `etl/config/sources.json`).
- **O-4 — backup export format:** PostgreSQL `pg_dump` custom format
  (`-Fc`); CSV-per-table was rejected (loses schema and FK order). Restore
  is tested, not just export.

## Tests

```bash
npm test   # node --test with the explicit file list
```

(`node --test tests/` — the directory form — fails on Node 24, so `npm test`
lists the test files explicitly; see `package.json`.)

| Suite | Files | Tests | What it covers |
|---|---|---|---|
| Unit | `tests/csv.test.ts`, `tests/normalize.test.ts`, `tests/validate-dedupe-anomaly.test.ts` | 50 | CSV parser (BOM/CRLF/quoted fields), TDLR + RMP normalization, status/verification split, dedupe rules incl. split clusters, anomaly thresholds, L1/L8 validation, invariant I1 |
| Contract | `tests/contract.test.ts` | 11 | Sample normalized records validate against `contract/normalized-record.v1.json` (Python `jsonschema` is the validation oracle — see below); missing fields fail; I1 enforced; bad checksum fails; unknown field fails; v2 record fails v1 schema; old v1 records validate against v1.1; new optional-field record validates against v1.1 but not v1; loader rejects unknown versions |
| DB | `tests/db.test.ts` | 9 | Real Postgres scratch DB (`housecraftpros_test`, created from the real migrations, loaded via the real driver) with 21-row RMP fixtures v1/v2: idempotency, disappeared handling, status change, unchanged-record no-history, rollback atomicity, backup/restore, round-trip — plus Sprint 02: cross-source reuse is logged as a dedupe decision (R-10), reuse + in-run merge of the same cluster extends the decision, no orphan business on a re-run of a new file version |
| Lookup | `tests/lookup.test.ts` | 7 | Sprint 02 Verify data layer on a scratch DB: active / expired / suspended (synthetic row) / not found / duplicate name (ambiguous) / name + trade filter; status and verification never collapsed; no "Verified" label |
| Review | `tests/review.test.ts` | 7 | Sprint 02 held-cluster review workflow on a scratch DB: list/show, dry-run plan changes nothing, merge moves licenses + removes the emptied business with an audit row, keep-separate records one decision, re-deciding throws, --by required |

**Contract validation oracle:** the ETL itself stays zero-dependency; the
tests shell out to Python `jsonschema` (installed on the VM) via
`tests/fixtures/validate_schema.py` to validate records against the JSON
Schema. That is the documented oracle, not a runtime dependency.

## Config

`etl/config/sources.json` — the 3 sources (URLs, expected headers, anomaly
thresholds, stale-`running` threshold). Anomaly thresholds: row-count jump
>10%, missing column, broken field format.

## Benchmark (non-production)

`etl/bench/` holds the Rust-readiness benchmark harness (T025/T028).
See `etl/bench/README.md` and `docs/architecture/rust-readiness.md`.
Nothing in `bench/` is in the production run path.

## Layout

```
etl/
  package.json            type: module, zero dependencies
  config/sources.json     per-source config
  contract/normalized-record.v1.json   data contract v1 (+ v1.1 in tests/fixtures)
  src/
    run.ts      driver: download → parse → normalize → dedupe → load → verify
    csv.ts      BOM/CRLF/quoted-field parser + header validation
    normalize.ts  pure TDLR + RMP adapters
    validate.ts   L1/L8 validation, invariant I1
    dedupe.ts     conservative dedupe
    anomaly.ts    pure threshold checks
    pg.ts       psql bridge (su postgres, temp-file queries)
    sqlgen.ts   COPY TSV + one-transaction run.sql per source
    verify.ts   13 post-load checks (incl. Sprint 02: no orphan businesses)
    backup.ts   pg_dump -Fc + tested restore
    crosscheck.ts 100-sample field-by-field cross-check vs source CSVs
    lookup.ts   read-only Verify data layer (by license number / by name)
    lookup-cli.ts  lookup CLI (prints LookupResult JSON)
    review.ts   held-cluster review workflow (list/show/plan/merge/keep-separate)
    review-cli.ts  review CLI (plan by default; --confirm executes)
  tests/        node:test suites (see table above)
  evidence/     cross-check evidence (pass/fail booleans + license numbers only, no PII)
  bench/        Rust-readiness benchmark (NON-PRODUCTION)
```
