# Data Dictionary — House Craft Pros (Sprint 01)

**Status:** proposed (Sprint 01) · **Date:** 25/11/2026 · **Contract:** `v1`
**Sources:** `db/migrations/0001_*.sql` … `0006_*.sql` (authoritative for types
and constraints) · `etl/contract/normalized-record.v1.json` · `research/
data-findings-2026-11-24.md` + header/null-rate analysis of the Nov-24 CSV
copies (25/11/2026).

**Conventions used below:**
- **Type** is the PostgreSQL type in the migration. `timestamptz` = timestamp
  with time zone; `uuid` PKs default to `gen_random_uuid()`.
- **Nullable = NO** means the column is `NOT NULL` in the DDL.
- **Source field** names the exact CSV column (or `—` when the value is
  derived / system-generated). Only fields documented in the research findings
  or the real CSV headers appear here — nothing is invented.
- **"NULL by source design"** means the source file itself leaves the field
  empty for a whole class of rows (e.g. HVAC phone 100% empty). That NULL is
  expected data, NOT an error, and the loader must never "fix" it by guessing.
- The two splits are called out wherever they appear:
  `license_status` (the license's own status) vs `verification_level` (our
  confidence), and Gate 1 `data_published_at` vs Gate 2
  `seo_index_published_at`.

---

## 1. `data_sources` — government sources we ingest

| Column | Type | Nullable | Meaning | Source field | Validation |
|---|---|---|---|---|---|
| `id` | uuid PK | NO | Surrogate key | — (generated) | — |
| `code` | text | NO | Stable source key: `tdlr-electrical` / `tdlr-hvac` / `tsbpe-rmp` | — (config) | UNIQUE |
| `agency` | text | NO | Issuing agency: `TDLR` / `TSBPE` | — (config) | — |
| `trade` | text | NO | Trade covered | — (config) | `IN ('electrical','hvac','plumbing')` |
| `file_name` | text | NO | Downloaded file name (`Lteecele.csv`, `ltairref.csv`, `rmp_download`) | — (config) | non-empty |
| `source_url` | text | YES | Exact file URL when known; NULL until confirmed — NEVER guessed | — (config/run) | URL format when present |
| `landing_page_url` | text | YES | Human-verifiable .gov page for the source | — (config) | URL format when present |
| `license_type_label` | text | NO | Value in the source's license-type column (`Electrical Contractor`, `A/C Contractor`, `Responsible Master Plumber`) | TDLR `LICENSE TYPE`; TSBPE: constant | non-empty |
| `has_status_field` | boolean | NO | TRUE only if the source file carries its own status column | TDLR: FALSE (no status column in headers); TSBPE: TRUE (`LIC_STATUS`) | — |
| `notes` | text | YES | Provenance notes (row counts, caveats) | research findings | — |
| `created_at` / `updated_at` | timestamptz | NO | Audit timestamps (`updated_at` via trigger) | — | — |

Seed rows (migration 0006): 3 rows, values from the research findings.

## 2. `locations` — state / county / city reference

| Column | Type | Nullable | Meaning | Source field | Validation |
|---|---|---|---|---|---|
| `id` | uuid PK | NO | Surrogate key | — | — |
| `state_code` | char(2) | NO | State (`TX` for MVP) | TDLR: parsed from `BUSINESS CITY, STATE ZIP` (`, TX`); TSBPE: `STATE` | 2 letters |
| `county_name` | text | NO | County name | TDLR `BUSINESS COUNTY`; TSBPE `COUNTY` | non-empty |
| `city_name` | text | YES | City name; **NULL = county-level location** (the only granularity HVAC supports) | TDLR: city part of `BUSINESS CITY, STATE ZIP`; TSBPE: `CITY` | — |
| `created_at` | timestamptz | NO | Audit timestamp | — | — |

Constraints: UNIQUE `(state_code, county_name, city_name)` NULLS NOT
DISTINCT. Note: `county_name` is stored as printed (no normalization of
county names in Sprint 01).

## 3. `license_holders` — person named on the license

| Column | Type | Nullable | Meaning | Source field | Validation |
|---|---|---|---|---|---|
| `id` | uuid PK | NO | Surrogate key | — | — |
| `full_name` | text | NO | Name exactly as printed | TDLR `NAME`; TSBPE: composed `FIRST_NAME [MIDDLE_NAME] LAST_NAME [SUFFIX]` | non-empty |
| `first_name` | text | YES | First name | TSBPE `FIRST_NAME`; TDLR: NULL (single NAME field, not split) | — |
| `last_name` | text | YES | Last name | TSBPE `LAST_NAME`; TDLR: NULL | — |
| `middle_name` | text | YES | Middle name | TSBPE `MIDDLE_NAME`; TDLR: NULL | — |
| `suffix` | text | YES | Suffix (Jr, Sr, III…) | TSBPE `SUFFIX`; TDLR: NULL | — |
| `created_at` / `updated_at` | timestamptz | NO | Audit timestamps | — | — |

No UNIQUE constraint (name spellings vary; holder dedupe out of scope).
**PII:** never exposed in any public view.

## 4. `ingestion_runs` — one row per ETL download+load attempt

| Column | Type | Nullable | Meaning | Source field | Validation |
|---|---|---|---|---|---|
| `id` | uuid PK | NO | Surrogate key (the run id every record traces to) | — | — |
| `source_id` | uuid FK → `data_sources` | NO | Which source was ingested | — (config) | FK |
| `contract_version` | text | NO | Data-contract version the run normalized against (e.g. `v1`) | — (engine) | non-empty; default `'v1'` |
| `status` | text | NO | Run outcome | — | `IN ('running','succeeded','failed','blocked_anomaly')`; default `'running'` |
| `source_url` | text | YES | Exact URL actually downloaded | — (download) | URL format when present |
| `file_date` | date | YES | As-of date of the source file, when known; NULL when unknown | source file metadata | — |
| `sha256_checksum` | text | YES | SHA-256 of the downloaded bytes | — (download) | `^[0-9a-f]{64}$` when present |
| `row_count_downloaded` | integer | YES | Rows in the downloaded file (incl. header handling per adapter) | file | ≥ 0 |
| `row_count_parsed` | integer | YES | Rows successfully parsed | parse stage | ≥ 0 |
| `row_count_loaded` | integer | YES | Rows upserted | load stage | ≥ 0 |
| `row_count_new` | integer | YES | Rows inserted (not seen before) | load stage | ≥ 0 |
| `row_count_changed` | integer | YES | Rows whose status/fields changed | load stage | ≥ 0 |
| `row_count_disappeared` | integer | YES | Rows absent from this file but present before | load stage | ≥ 0 |
| `started_at` | timestamptz | NO | Run start | — | default `now()` |
| `finished_at` | timestamptz | YES | Run end (NULL while running) | — | — |
| `error_message` | text | YES | Failure reason (download/parse/load/anomaly) | — | — |
| `notes` | text | YES | Free notes (e.g. "fallback to Nov-24 local copy, as-of 24/11/2026") | — | — |
| `created_at` | timestamptz | NO | Audit timestamp | — | — |

Constraints: UNIQUE `(source_id, sha256_checksum)` WHERE checksum NOT NULL
(re-ingest of the same file is a no-op — US5).

## 5. `businesses` — deduped business identity

| Column | Type | Nullable | Meaning | Source field | Validation |
|---|---|---|---|---|---|
| `id` | uuid PK | NO | Surrogate key | — | — |
| `name` | text | NO | Display name, as printed | TDLR `BUSINESS NAME`; TSBPE `PLUMB_COMPANY`; fallback to holder `full_name` ONLY when the source business name is empty (HVAC 2.1%, RMP 0.1%) | non-empty |
| `normalized_name` | text | NO | Dedupe/search key: lowercased, punctuation stripped, whitespace collapsed | derived from `name` by the loader (deterministic) | non-empty |
| `slug` | text | YES | URL slug for `/contractors/[slug]/`; set at publication time (Sprint 03) | — (app) | UNIQUE when present (NULLs allowed) |
| `phone` | text | YES | Business phone as printed | TDLR `BUSINESS PHONE`; TSBPE `PHONE` | — |
| `phone_normalized` | text | YES | Digits only (10 US digits when parseable) | derived from `phone` | `^[0-9]{10}$` when present (loader rule; not a DB CHECK) |
| `address_line1` | text | YES | Street address | TDLR `BUSINESS ADDRESS-LINE1`; TSBPE `ADDR1` | — |
| `address_line2` | text | YES | Address line 2 | TDLR `BUSINESS ADDRESS-LINE2`; TSBPE `ADDR2` | — |
| `city` | text | YES | City | TDLR: city part of `BUSINESS CITY, STATE ZIP`; TSBPE `CITY` | — |
| `state_code` | char(2) | NO | State | TDLR: parsed `, TX`; TSBPE `STATE` | default `'TX'` |
| `zip` | text | YES | ZIP as text (leading zeros matter) | TDLR `BUSINESS ZIP` / ZIP part of `BUSINESS CITY, STATE ZIP`; TSBPE `ZIP` | text, never numeric |
| `county` | text | YES | Business county as printed | TDLR `BUSINESS COUNTY`; TSBPE `COUNTY` | — |
| `location_id` | uuid FK → `locations` | YES | Primary location | derived (lookup/creation in `locations`) | FK |
| `dedupe_status` | text | NO | `single` / `merged` / `ambiguous_held` | dedupe stage | CHECK enum; default `'single'` |
| `phone_withheld_for_legal_review` | boolean | NO | TRUE hides the phone from every public view (sole-proprietor personal phone pending lawyer review) | — (human/legal review only) | default FALSE; never set by the ETL |
| `data_published_at` | timestamptz | YES | **GATE 1** — non-NULL = business visible in Verify tool / directory data | publication step | — |
| `seo_index_published_at` | timestamptz | YES | **GATE 2** — non-NULL = business profile URL in sitemap index + indexable; independent of GATE 1 | publication step | — |
| `first_seen_run_id` | uuid FK → `ingestion_runs` | YES | Run that first saw this business | loader | FK |
| `last_seen_run_id` | uuid FK → `ingestion_runs` | YES | Most recent run that saw this business | loader | FK |
| `created_at` / `updated_at` | timestamptz | NO | Audit timestamps | — | — |

**NULL by source design (not errors):** HVAC rows have `phone`,
`phone_normalized`, `address_line1/2`, `city`, `zip` ALL NULL (100% empty in
the source file). RMP rows without an address have `phone`, `address_line1`,
`city`, `zip` NULL (4,604/9,416 rows — the same rows lack all of them).

## 6. `licenses` — one row per government license

| Column | Type | Nullable | Meaning | Source field | Validation |
|---|---|---|---|---|---|
| `id` | uuid PK | NO | Surrogate key | — | — |
| `business_id` | uuid FK → `businesses` | NO | Owning business | dedupe stage | FK |
| `holder_id` | uuid FK → `license_holders` | YES | Person named on the license | `license_holders` row | FK |
| `source_id` | uuid FK → `data_sources` | NO | Source file | — (config) | FK |
| `ingestion_run_id` | uuid FK → `ingestion_runs` | YES | Run that last loaded this row | loader | FK |
| `contract_version` | text | NO | Contract version this persisted record conforms to (denormalized from the run) | `ingestion_runs.contract_version` | default `'v1'` |
| `trade` | text | NO | `electrical` / `hvac` / `plumbing` | derived from `source_id` | CHECK enum |
| `license_type` | text | NO | As printed | TDLR `LICENSE TYPE`; TSBPE constant `Responsible Master Plumber` | non-empty |
| `license_subtype` | text | YES | TDLR subtype (`EC`; `AC`/`AE`/`BE`/`BC`/`AR`/`BR`/…) | TDLR `LICENSE SUBTYPE` | NULL for RMP (no such column) and when the source cell is empty (1 HVAC row) |
| `license_number` | text | NO | As printed, trimmed | TDLR `LICENSE NUMBER`; TSBPE `LICENSE_NBR` | non-empty; length varies (1–6 chars), never padded |
| `expiration_date` | date | YES | Expiration date (ISO) | TDLR `LICENSE EXPIRATION DATE` (` MM/DD/YYYY`, leading space — adapter trims); TSBPE `EXPIRATION_DTE` | date; NULL only if the source cell is empty (0% in the 24/11/2026 files) |
| `issue_date` | date | YES | Issue date (ISO) | TSBPE `LICENSE_DATE` only | NULL for TDLR (no such column) |
| `license_status` | text | NO | **THE LICENSE's own status** — `active` / `expired` / `suspended` / `revoked` / `cancelled` / `pending` / `inactive` / `unknown` | TDLR: derived from `expiration_date` (active if ≥ file date, expired if past, unknown if NULL); TSBPE: mapped from `LIC_STATUS` (`Current`→`active`, `Expired`→`expired`) | CHECK enum |
| `verification_level` | text | NO | **OUR confidence** — `authority-confirmed` / `inferred` / `unverified` | TDLR: `inferred` (always); TSBPE: `authority-confirmed` for the status value itself | CHECK enum + CHECK `licenses_inferred_rule` (see below) |
| `license_status_source` | text | NO | How the status was derived: `source_field` / `expiration_date` / `gov_lookup` / `unknown` | TDLR: `expiration_date`; TSBPE: `source_field` | CHECK enum |
| `status_as_of` | date | NO | Date the status statement is true as of (source file date, else run date) | `ingestion_runs.file_date` or run date | date |
| `endorsements` | jsonb | NO | RMP endorsements, e.g. `["MEDGAS","WS"]`; `[]` otherwise | TSBPE `MEDGAS_ENDR`/`MRF_ENDR`/`WS_ENDR` = `Yes` | default `'[]'` |
| `insurance_company` | text | YES | Insurer name | TSBPE `INSURANCE_COMPANY` | NULL for TDLR; empty in 11/9,416 RMP rows |
| `insurance_expiry_date` | date | YES | Insurance expiry (ISO) | TSBPE `INS_EXPIRY_DTE` | NULL for TDLR; empty in 11/9,416 RMP rows |
| `county` | text | YES | License county as printed (denormalized for lookup) | TDLR `BUSINESS COUNTY`; TSBPE `COUNTY` | — |
| `location_id` | uuid FK → `locations` | YES | License location | derived | FK |
| `disappeared_from_source` | boolean | NO | TRUE when present in an earlier run but absent from the latest source file | loader comparison | default FALSE; CHECK pairs with `disappeared_at` |
| `disappeared_at` | timestamptz | YES | When the disappearance was detected | loader | non-NULL iff `disappeared_from_source` is TRUE |
| `data_published_at` | timestamptz | YES | **GATE 1** — non-NULL = license visible in Verify tool / directory data | publication step | — |
| `seo_index_published_at` | timestamptz | YES | **GATE 2** — non-NULL = license profile URL in sitemap index + indexable; independent of GATE 1 | publication step | — |
| `first_seen_at` / `last_seen_at` | timestamptz | NO | First / most recent run that saw this license | loader | default `now()` |
| `created_at` / `updated_at` | timestamptz | NO | Audit timestamps | — | — |

Constraints: UNIQUE `(source_id, license_type, license_number)`; CHECK
`licenses_inferred_rule`: `(license_status_source = 'expiration_date' AND
verification_level <> 'authority-confirmed') OR (license_status_source <>
'expiration_date')` — **the split, enforced by the database**.

## 7. `license_status_history` — status history (append-only)

| Column | Type | Nullable | Meaning | Source field | Validation |
|---|---|---|---|---|---|
| `id` | uuid PK | NO | Surrogate key | — | — |
| `license_id` | uuid FK → `licenses` | NO | License the change belongs to | loader | FK |
| `previous_status` | text | YES | Status before the change; NULL on initial load | previous `licenses.license_status` | status enum when present |
| `new_status` | text | NO | Status after the change | new `licenses.license_status` | CHECK status enum |
| `previous_verification_level` | text | YES | Confidence before; NULL on initial load | previous value | enum when present |
| `new_verification_level` | text | YES | Confidence after | new value | enum when present |
| `change_reason` | text | NO | `initial_load` / `expiration_passed` / `source_status_change` / `disappeared_from_source` / `reappeared_in_source` / `correction` / `gov_lookup` | loader | CHECK enum |
| `run_id` | uuid FK → `ingestion_runs` | YES | Run that detected the change | loader | FK |
| `changed_at` | timestamptz | NO | When the change was recorded | — | default `now()` |
| `notes` | text | YES | Free notes | — | — |

Rule: one row per change; unchanged records get NO row (idempotency, US5).

## 8. `claims` — business-claim requests

| Column | Type | Nullable | Meaning | Source field | Validation |
|---|---|---|---|---|---|
| `id` | uuid PK | NO | Surrogate key | — | — |
| `business_id` | uuid FK → `businesses` | NO | Business being claimed | claim form | FK |
| `claimant_name` | text | NO | Claimant's name | claim form | non-empty |
| `claimant_phone` | text | NO | Claimant's phone — used ONLY for the manual verification call | claim form | non-empty; never published/marketed |
| `relationship` | text | NO | Relationship to the business (`owner` / `employee` / `authorized_representative`…) | claim form | non-empty |
| `status` | text | NO | `pending` / `in_review` / `verified` / `rejected` | workflow | CHECK enum; default `'pending'` |
| `verified_by` | text | YES | Who made the verification call | staff | — |
| `verified_at` | timestamptz | YES | When verification completed | staff | non-NULL iff `status='verified'` (CHECK) |
| `notes` | text | YES | Free notes | — | — |
| `created_at` / `updated_at` | timestamptz | NO | Audit timestamps | — | — |

No email column by design (no excess collection, spec v2 §6.5).

## 9. `correction_requests` — correct / remove requests

| Column | Type | Nullable | Meaning | Source field | Validation |
|---|---|---|---|---|---|
| `id` | uuid PK | NO | Surrogate key | — | — |
| `business_id` | uuid FK → `businesses` | YES | Business targeted (NULL if license-only) | form | FK; CHECK: `business_id` OR `license_id` NOT NULL |
| `license_id` | uuid FK → `licenses` | YES | License targeted (NULL if business-only) | form | FK |
| `requester_name` | text | YES | Requester name | form | — |
| `requester_phone` | text | YES | Requester phone | form | — |
| `request_type` | text | NO | `correction` / `removal` / `other` | form | CHECK enum |
| `details` | text | NO | What is wrong / what should change | form | non-empty |
| `status` | text | NO | `pending` / `in_review` / `resolved` / `rejected` | workflow | CHECK enum; default `'pending'` |
| `resolved_at` | timestamptz | YES | When resolved | staff | — |
| `created_at` / `updated_at` | timestamptz | NO | Audit timestamps | — | — |

## 10. `publication_batches` — publication events

| Column | Type | Nullable | Meaning | Source field | Validation |
|---|---|---|---|---|---|
| `id` | uuid PK | NO | Surrogate key | — | — |
| `name` | text | NO | Batch name, e.g. `batch-2026-11-25-guides+tool` | publisher | non-empty |
| `gate_scope` | text | NO | Which gate(s) this batch opens: `data` / `seo_index` / `both` | publisher | CHECK enum |
| `status` | text | NO | `draft` / `approved` / `published` / `rolled_back` | workflow | CHECK enum; default `'draft'` |
| `record_count` | integer | NO | Member records (must match `publication_batch_items` count for the batch) | publisher | ≥ 0; default 0 |
| `data_published_at` | timestamptz | YES | **GATE 1, batch level** — when this batch opened data publication | publisher | NULL unless `gate_scope` is `data` or `both` (CHECK) |
| `seo_index_published_at` | timestamptz | YES | **GATE 2, batch level** — when this batch opened SEO-index publication | publisher | NULL unless `gate_scope` is `seo_index` or `both` (CHECK) |
| `created_by` | text | YES | Who created the batch | — | — |
| `approved_by` | text | YES | Who approved it | — | — |
| `rolled_back_at` | timestamptz | YES | When the batch was rolled back | rollback | — |
| `rolled_back_to_batch_id` | uuid FK → `publication_batches` | YES | Prior batch restored by the rollback | rollback | FK (self) |
| `notes` | text | YES | Free notes | — | — |
| `created_at` / `updated_at` | timestamptz | NO | Audit timestamps | — | — |

## 11. `publication_batch_items` — per-record batch membership (PROPOSED)

| Column | Type | Nullable | Meaning | Source field | Validation |
|---|---|---|---|---|---|
| `id` | uuid PK | NO | Surrogate key | — | — |
| `batch_id` | uuid FK → `publication_batches` | NO | Batch | publisher | FK |
| `license_id` | uuid FK → `licenses` | YES | License published (NULL if business-only item) | publisher | FK; CHECK: `license_id` OR `business_id` NOT NULL |
| `business_id` | uuid FK → `businesses` | YES | Business published (NULL if license-only item) | publisher | FK |
| `gate` | text | NO | Which gate this item opened: `data` / `seo_index` | publisher | CHECK enum |
| `published_at` | timestamptz | NO | When this item was published | — | default `now()` |
| `created_at` | timestamptz | NO | Audit timestamp | — | — |

Constraints: UNIQUE `(batch_id, license_id, gate)` WHERE license NOT NULL;
UNIQUE `(batch_id, business_id, gate)` WHERE business NOT NULL. This table is
what makes rollback exact (US5).

## 12. `audit_logs` — append-only change evidence

| Column | Type | Nullable | Meaning | Source field | Validation |
|---|---|---|---|---|---|
| `id` | uuid PK | NO | Surrogate key | — | — |
| `actor` | text | NO | Who acted: `etl` / `admin:<identifier>` / `system` | caller | non-empty |
| `action` | text | NO | What happened, e.g. `license.upsert`, `batch.publish`, `claim.verify` | caller | non-empty |
| `table_name` | text | NO | Table affected | caller | non-empty |
| `record_id` | uuid | YES | Row affected | caller | — |
| `old_values` | jsonb | YES | Pre-change snapshot (NULL for inserts) | caller | — |
| `new_values` | jsonb | YES | Post-change snapshot | caller | — |
| `run_id` | uuid FK → `ingestion_runs` | YES | Run, when the action belongs to one | loader | FK |
| `created_at` | timestamptz | NO | When the action happened | — | default `now()` |

UPDATE/DELETE revoked for `app_admin` (append-only).

## 13. `dedupe_decisions` — every dedupe decision (PROPOSED)

| Column | Type | Nullable | Meaning | Source field | Validation |
|---|---|---|---|---|---|
| `id` | uuid PK | NO | Surrogate key | — | — |
| `run_id` | uuid FK → `ingestion_runs` | YES | Run the decision was made in | loader | FK |
| `cluster_key` | text | NO | Normalized-name key the candidates grouped under | dedupe stage | non-empty |
| `license_ids` | uuid[] | NO | Candidate license ids (the exact cluster decided about) | dedupe stage | ≥ 2 elements (CHECK `cardinality >= 2`) |
| `business_id` | uuid FK → `businesses` | YES | Resulting business, when merged | dedupe stage | non-NULL iff `decision='merged'` (CHECK) |
| `decision` | text | NO | `merged` / `held_ambiguous` / `rejected_no_merge` | dedupe stage / human | CHECK enum |
| `rationale` | text | NO | Why: which evidence matched / what was missing | dedupe stage / human | non-empty |
| `decided_by` | text | NO | `etl` / `human:<identifier>` | dedupe stage / human | default `'etl'` |
| `decided_at` | timestamptz | NO | When decided | — | default `now()` |
| `created_at` | timestamptz | NO | Audit timestamp | — | — |

## 14. `source_conflicts` — cross-source disagreements (PROPOSED)

| Column | Type | Nullable | Meaning | Source field | Validation |
|---|---|---|---|---|---|
| `id` | uuid PK | NO | Surrogate key | — | — |
| `license_id` | uuid FK → `licenses` | YES | License concerned (NULL if not yet matched to a row) | loader | FK |
| `license_number` | text | NO | License number in dispute | loader | non-empty |
| `license_type` | text | NO | License type in dispute | loader | non-empty |
| `field_name` | text | NO | Field that disagrees, e.g. `license_status`, `expiration_date`, `business_name` | loader | non-empty |
| `value_a` | text | YES | Value from source A | source A | — |
| `value_b` | text | YES | Value from source B | source B | — |
| `source_a_id` | uuid FK → `data_sources` | YES | Source A | loader | FK |
| `source_b_id` | uuid FK → `data_sources` | YES | Source B | loader | FK |
| `status` | text | NO | `open` / `resolved_a` / `resolved_b` / `resolved_manual` / `ignored` | workflow | CHECK enum; default `'open'` |
| `resolution_notes` | text | YES | How it was resolved | human | — |
| `run_id` | uuid FK → `ingestion_runs` | YES | Run that found the conflict | loader | FK |
| `created_at` | timestamptz | NO | When found | — | default `now()` |
| `resolved_at` | timestamptz | YES | When resolved | human | non-NULL iff `status <> 'open'` (CHECK) |

## 15. Public views (not tables — the only public read path)

| View | Rows | Columns (publishable only) |
|---|---|---|
| `v_public_businesses` | `businesses` with GATE 1 set | `id`, `name`, `slug`, `phone` (NULL when withheld), `address_line1/2`, `city`, `state_code`, `zip`, `county`, `data_published_at` |
| `v_public_licenses` | `licenses` + `businesses` with GATE 1 set on BOTH; expired/disappeared INCLUDED and flagged | license number/type/subtype/trade, `license_status`, `verification_level`, `license_status_source`, `status_as_of`, `expiration_date`, `issue_date`, `endorsements`, `county`, `disappeared_from_source`, business name/slug/phone (NULL when withheld)/city/state/ZIP, `source_agency`, `source_code`, `source_lookup_url` |
| `v_seo_indexable_licenses` | `licenses` + `businesses` with GATE 2 set on BOTH | `id`, license number/type/trade, business id/name/slug/city/county, `seo_index_published_at` |

No view exposes holder names, claimant/requester contacts, run ids,
checksums, or internal dedupe fields.
