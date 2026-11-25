# Data Contract — House Craft Pros (language-independent, versioned)

**Status:** proposed (Sprint 01) · **Current version:** `v1` · **Date:** 25/11/2026
**Canonical sources of this contract (in priority order):**
1. `etl/contract/normalized-record.v1.json` — JSON Schema (draft 2020-12) for the
   normalized record. This file is the authority for record shape.
2. `db/migrations/*.sql` — PostgreSQL DDL for the persisted shape. This is the
   authority for storage (tables, constraints, RLS, views).
3. This document — the human-readable contract: interfaces, versioning rules,
   and the invariants both machine sources enforce.

**TypeScript types are DERIVED from (1) and (2), never the standard.**
Any `.ts` type that disagrees with the JSON Schema or the DDL is wrong; fix the
type, not the contract. (Rationale: the backend is designed to move to Rust
later — ADR-0001 — and a TypeScript-only contract would not survive the swap.
JSON Schema + SQL DDL are readable by TypeScript, Rust, Python, and SQL alike.)

---

## 1. What the contract covers

| Piece | Machine source | Human source |
|---|---|---|
| Normalized record shape (one license, after parsing) | `etl/contract/normalized-record.v1.json` | §2 below |
| Persisted shape (tables, constraints, RLS, views) | `db/migrations/0001_*.sql` … `0006_*.sql` | `docs/architecture/data-model.md`, `data-dictionary.md` |
| Source adapter interface (fetch / parse / checksum) | — (interface, §3) | §3 below |
| Loader interface (what the loader accepts + guarantees) | — (interface, §4) | §4 below |
| DB contract (what the frontend may assume) | `db/migrations/0005_rls_views.sql` (views) | §5 below, `data-model.md` §7 |

The ETL worker (Phase 2) implements the interfaces in §3–§4 against the schema
in `etl/contract/`; the compatibility tests for the contract (validate a sample
record against the schema; test a version bump) are written by the ETL worker
from this document + the schema file — see §6 for exactly what those tests
must cover.

## 2. Normalized record (v1)

**Schema file:** `etl/contract/normalized-record.v1.json` (JSON Schema 2020-12).

One normalized record = one license row from one government source file, after
parsing and normalization, before dedupe and load. Required fields:

| Field | Meaning |
|---|---|
| `contract_version` | `"v1"` (const). Every record carries it. |
| `source_code` | `tdlr-electrical` \| `tdlr-hvac` \| `tsbpe-rmp` (must match `data_sources.code`). |
| `trade` | `electrical` \| `hvac` \| `plumbing`. |
| `license_type` | As printed, e.g. `"Electrical Contractor"`, `"A/C Contractor"`, `"Responsible Master Plumber"`. |
| `license_number` | As printed, trimmed. Length varies (1–6 chars) — never pad. |
| `license_status` | `active` \| `expired` \| `suspended` \| `revoked` \| `cancelled` \| `pending` \| `inactive` \| `unknown`. |
| `license_status_source` | `source_field` \| `expiration_date` \| `gov_lookup` \| `unknown`. |
| `verification_level` | `authority-confirmed` \| `inferred` \| `unverified`. |
| `status_as_of` | Date (YYYY-MM-DD) the status statement is true as of. |
| `source` | `{ file_name, sha256_checksum, source_url, file_date }` — provenance. |

Optional / nullable fields (full definitions live in the schema file):
`license_subtype`, `business_name` (+ `business_name_normalized`), `holder`
(`full_name` + first/last/middle/suffix), `phone` (+ `phone_normalized`),
`address` (`line1`, `line2`, `city`, `state`, `zip`, `county`, `county_code`),
`expiration_date`, `issue_date`, `endorsements` (`["MEDGAS","MRF","WS"]`),
`insurance` (`{company, expiry_date}`), `raw_row` (verbatim parsed row, audit only).

**Invariants (enforced in THREE places — schema `allOf`, loader, DB CHECK):**
- **I1 — inferred can never be authority-confirmed.** If
  `license_status_source = "expiration_date"` then `verification_level` MUST be
  `inferred` or `unverified`. The JSON Schema enforces this with `if/then`;
  the DB enforces it with `licenses_inferred_rule`; the loader MUST reject a
  record that violates it before loading. (This is the load-bearing rule of the
  whole project: TDLR CSVs have no status field, so their status is inferred.)
- **I2 — no invented identity.** `business_name`, `phone`, `address.*` are NULL
  when the source cell is empty. The adapter MUST NOT substitute another
  column's value (e.g. TDLR mailing phone for business phone) or guess.
- **I3 — provenance is mandatory.** `source.sha256_checksum` (lowercase hex,
  64 chars) and `source.file_name` are required on every record; a record
  without provenance is rejected by the loader.
- **I4 — dates are ISO.** All dates are `YYYY-MM-DD` strings. Source formats
  (` MM/DD/YYYY` with a leading space in TDLR CSVs, `MM/DD/YYYY` in RMP) are
  converted by the adapter; an unparseable date becomes NULL and forces
  `verification_level = "unverified"` (with a note), never a guessed date.

**Source-field mapping (v1)** — the only fields the adapter may read. Anything
not listed here does not exist in v1:

| Normalized field | TDLR electrical (`Lteecele.csv`) | TDLR HVAC (`ltairref.csv`) | TSBPE RMP (`rmp_download`) |
|---|---|---|---|
| `license_type` | `LICENSE TYPE` | `LICENSE TYPE` | `"Responsible Master Plumber"` (constant — the file has no type column) |
| `license_number` | `LICENSE NUMBER` | `LICENSE NUMBER` | `LICENSE_NBR` |
| `license_subtype` | `LICENSE SUBTYPE` | `LICENSE SUBTYPE` | — (NULL) |
| `expiration_date` | `LICENSE EXPIRATION DATE` | `LICENSE EXPIRATION DATE` | `EXPIRATION_DTE` |
| `issue_date` | — (NULL) | — (NULL) | `LICENSE_DATE` |
| `license_status` | derived from expiration date | derived from expiration date | mapped from `LIC_STATUS` (`Current`→`active`, `Expired`→`expired`) |
| `license_status_source` | `expiration_date` | `expiration_date` | `source_field` |
| `verification_level` | `inferred` | `inferred` | `authority-confirmed` (status value only) |
| `business_name` | `BUSINESS NAME` | `BUSINESS NAME` | `PLUMB_COMPANY` |
| `holder.full_name` | `NAME` | `NAME` | composed from `FIRST_NAME` + `MIDDLE_NAME` + `LAST_NAME` + `SUFFIX` |
| `phone` | `BUSINESS PHONE` | — (always NULL: column 100% empty) | `PHONE` |
| `address.*` | `BUSINESS ADDRESS-LINE1/-LINE2`, city/ZIP from `BUSINESS CITY, STATE ZIP`, `BUSINESS COUNTY`, `BUSINESS COUNTY CODE`, `BUSINESS ZIP` | `BUSINESS COUNTY`, `BUSINESS COUNTY CODE` only (address/city/ZIP/phone 100% empty) | `ADDR1`, `ADDR2`, `CITY`, `STATE`, `ZIP`, `COUNTY` |
| `endorsements` | `[]` | `[]` | `MEDGAS_ENDR` / `MRF_ENDR` / `WS_ENDR` = `Yes` |
| `insurance` | NULL | NULL | `INSURANCE_COMPANY`, `INS_EXPIRY_DTE` |

Columns present in the CSVs but NOT mapped in v1 (deliberately ignored —
documented so a future version can adopt them consciously):
TDLR `COUNTY` (licensee county — differs from `BUSINESS COUNTY`; ignored
because the business county is the directory geography), `MAILING ADDRESS *`,
`PHONE NUMBER` (mailing phone — 99.9% empty for electrical; never a substitute
for the business phone), `CONTINUING EDUCATION FLAG`, `Same Address or not`,
`Business Address that mentions BOX`, `Mailing address that mentions BOX`,
`Phone-same or not`; RMP `RANK` (constant `M`), `ADDR3` (empty in 9,397/9,416
rows — ignored in v1; a future version may map it if needed),
`AGENT_PHONE` (insurance agent's phone — not the business's; never published).

## 3. Source adapter interface

A source adapter is the unit that knows ONE government source. It MUST provide:

```
fetch(config) -> { bytes, sha256_checksum, source_url, file_date | null }
  # Downloads the source file. Records the exact URL actually fetched and the
  # SHA-256 of the bytes. On HTTP failure / unexpected content-type / empty
  # body: FAIL the run (log, change nothing). Never retries silently more than
  # the configured limit; never falls back to a stale local copy without
  # recording that fact in the run notes.

parse(bytes, config) -> rows: RawRow[]
  # Parses the file into verbatim rows (header name -> raw cell string).
  # MUST validate the header row against the expected columns for this source
  # (see §2 mapping). A missing required column or a renamed header is a
  # HARD failure: stop before loading (US1). Unknown extra columns are
  # ignored (logged), never fatal — sources add columns over time.

normalize(row, context) -> NormalizedRecord  (conforming to the JSON Schema)
  # Maps one raw row to the canonical shape (§2). Pure function of (row,
  # source config, file date): no network, no DB access, no global state.
  # Enforces I1–I4. A row that cannot be normalized (e.g. no license number)
  # is reported as a PARSE ERROR with the row number and reason — counted,
  # never silently dropped, never loaded with a fabricated number.

source_metadata() -> { code, agency, trade, file_name, license_type_label,
                       has_status_field, landing_page_url }
  # Static metadata for this source. Must match the data_sources seed row
  # (db/migrations/0006_seed_sources.sql). has_status_field=false FORCES the
  # adapter to derive status from the expiration date (I1).
```

Config (per source/state/trade — see `etl-pipeline.md` §6): URL(s), expected
headers, trade, license-type label, file-date extraction rule, checksum
algorithm (`SHA-256`), retry limit. The adapter contains NO House Craft Pros
business logic (no publication gates, no dedupe, no SEO) — only source
knowledge. A new state/trade/source = a new adapter + a new config entry, not
a change to the engine.

## 4. Loader interface

The loader takes normalized records and writes them to PostgreSQL. It accepts:

```
load(run_context, records: NormalizedRecord[]) -> LoadReport
  run_context = { run_id, source_id, contract_version, started_at }
  LoadReport  = { loaded, new, changed, disappeared, unchanged,
                  parse_errors, conflicts, anomalies }
```

Guarantees (the loader MUST provide all of these; they are contractual, not
aspirational):
- **L1 — schema validation first.** Every record is validated against
  `etl/contract/normalized-record.<version>.json` BEFORE any DB write. An
  invalid record is rejected with the schema error; the run fails if any
  record is invalid (no partial loads of a bad file).
- **L2 — idempotency.** Loading the same file (same SHA-256) twice changes
  nothing: no duplicate rows, no new `license_status_history` rows for
  unchanged records. Enforced by the `(source_id, sha256_checksum)` unique
  index on `ingestion_runs` + the upsert key `(source_id, license_type,
  license_number)` on `licenses`.
- **L3 — upsert by identity, never by rowid.** A record is matched on
  `(source_id, license_type, license_number)`. A match updates the mutable
  fields and `last_seen_at`; a miss inserts. The loader never deletes a row.
- **L4 — history on change only.** A `license_status_history` row is appended
  exactly when `license_status` or `verification_level` changes (or on
  initial load, or on disappearance/reappearance). Unchanged records get no
  history row.
- **L5 — disappeared, not deleted.** A license present in the previous run but
  absent from the current file is marked `disappeared_from_source = true` +
  `disappeared_at = now()` + a history row (`change_reason =
  'disappeared_from_source'`). It stays queryable.
- **L6 — conflicts are recorded, never silently resolved.** If two sources
  disagree about the same license, both values go to `source_conflicts`
  (status `open`); the license row keeps its previous value.
- **L7 — atomicity per run.** A run's load is one transaction: on any failure,
  the whole run rolls back and the run row is marked `failed`. Publication is
  a separate step (gates), never part of loading.
- **L8 — contract version is recorded.** The run row carries
  `contract_version`; every persisted license row carries the same value
  (`licenses.contract_version`). A record whose `contract_version` the loader
  does not support is rejected before validation.

## 5. DB contract (what the frontend may assume)

The frontend (Next.js, Sprint 02+) reads ONLY the public views in
`db/migrations/0005_rls_views.sql` — never base tables. It may assume:

- `v_public_licenses` returns exactly the data-published licenses (GATE 1 on
  both license and business), with `business_phone` NULL when withheld for
  legal review, and with expired/disappeared licenses INCLUDED and flagged
  (never "not found" for a license that existed).
- `v_public_businesses` returns exactly the data-published businesses.
- `v_seo_indexable_licenses` returns exactly the SEO-gate-published records
  (GATE 2 on both rows). The sitemap builder applies the thin-page quality
  rule on top; the view is the gate, not the quality rule.
- Column names and types in those views are STABLE across minor contract
  versions. A breaking change to a view requires a MAJOR version bump (§7)
  and a migration.
- `license_status` and `verification_level` are always present, always from
  the enums in §2, and always consistent with I1.
- `status_as_of` is always present: display "License status as reported in
  [source_agency] on [status_as_of]" + the `source_lookup_url` link.
- No view ever exposes holder personal names, claimant/requester contact
  details, or internal fields (dedupe status, run ids, checksums).

## 6. Compatibility tests the ETL worker must write (from this contract)

The ETL worker (Phase 2) writes these tests against the schema file — the
schema is written so each test is mechanical:

1. **Valid record validates.** The example in the schema file validates.
2. **Missing required field fails.** Removing any of the 10 required fields
   fails validation (at minimum: `license_number`, `contract_version`,
   `source.sha256_checksum`).
3. **Invariant I1 is enforced by the schema.** A record with
   `license_status_source = "expiration_date"` and
   `verification_level = "authority-confirmed"` fails validation; the same
   record with `"inferred"` passes; `source_field` +
   `"authority-confirmed"` passes.
4. **Bad checksum fails.** `source.sha256_checksum` that is not 64 lowercase
   hex chars fails validation.
5. **Unknown field fails.** A record with an extra top-level property fails
   validation (`additionalProperties: false`) — this is what forces a version
   bump for new fields (§7).
6. **Version bump test.** A `v1` record validates against the v1 schema; a
   record carrying `contract_version: "v2"` FAILS against the v1 schema
   (const `"v1"`); after a v2 schema is published, the v2 record validates
   against v2 and the loader accepts it (see §7 for how v2 is introduced).
7. **Loader rejects unknown versions.** The loader rejects a record whose
   `contract_version` it does not support, before any DB write (L8).
8. **Round-trip.** A normalized record loaded and read back from the DB has
   identical `license_status`, `verification_level`, `license_status_source`,
   `expiration_date`, and `contract_version`.

## 7. Versioning rules

Versions are `v<major>` for the contract as a whole (`v1` today). Minor
evolution inside a major version is tracked by the schema file name
(`normalized-record.v1.json` stays the v1 line; a compatible addition ships as
`normalized-record.v1.1.json` ONLY if tooling needs it — the `contract_version`
value carried on records and runs stays `v1` until a major bump; see below).

- **Adding an OPTIONAL field (minor, backwards-compatible):** allowed without
  a major bump. The field MUST be optional/nullable in the schema, the loader
  MUST accept records with and without it, and the DB change (if any) MUST be
  a nullable column added by a new migration. The change is documented in
  this file's changelog (§8). Example: adding `address.addr3` or a new
  endorsement code.
- **Adding a NEW SOURCE (minor):** a new `source_code` enum value + a new
  `data_sources` seed row + a new adapter. Existing records are unaffected.
  (Adding a source whose file HAS a status field is still minor — the
  `license_status_source = "source_field"` path already exists.)
- **BREAKING change (major bump, new `v<major>`):** any of: removing or
  renaming a field; changing a field's type; making an optional field
  required; changing an enum's meaning; changing the upsert identity
  `(source_id, license_type, license_number)`; changing a public view's
  columns. A major bump REQUIRES: a new schema file
  (`normalized-record.v2.json`), a migration for any DB change, an entry in
  §8, and a loader that accepts BOTH the old and the new version during a
  transition window (or a documented cutover run). Records carry the version
  they were normalized under (`contract_version`); runs record theirs
  (`ingestion_runs.contract_version`); the DB stores both (run + license row).
- **Never:** silently change the meaning of a value (e.g. redefining what
  `inferred` means) without a major bump. Never bump the version for a
  documentation-only change.

## 8. Changelog

| Version | Date | Change |
|---|---|---|
| v1 | 25/11/2026 | Initial contract (Sprint 01): 3 Texas sources (TDLR electrical, TDLR HVAC, TSBPE RMP); split `license_status` / `verification_level`; invariants I1–I4; loader guarantees L1–L8. |

## 9. Open items

- **[NEEDS CLARIFICATION] NC-1** — the exact TDLR licfile.asp download URL for
  `Lteecele.csv` / `ltairref.csv` was not in the research files (only the page
  name `licfile.asp` is documented in spec v2 §4). The seed migration records
  the TDLR home page as `source_url` and does NOT guess the file URL. The ETL
  worker must confirm the exact URL at implementation time and record it in
  `ingestion_runs.source_url` (and update the seed + this doc if it is stable).
- **[NEEDS CLARIFICATION] NC-2** — the exact TSBPE RMP download URL/format:
  the landing page is `https://tsbpe.texas.gov/free-licensee-list/` (verified
  from the saved page). Whether the page exposes a direct CSV link must be
  confirmed at implementation time; if not, the implementer records the
  fallback method used and its as-of date (spec.md §[NEEDS CLARIFICATION]).
- **TDLR `COUNTY` vs `BUSINESS COUNTY`:** v1 uses `BUSINESS COUNTY` only.
  If a future version needs the licensee county, it is a minor addition
  (`address.licensee_county`, nullable) — not a silent reuse of `county`.
