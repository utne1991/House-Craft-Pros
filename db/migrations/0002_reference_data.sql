-- =============================================================================
-- House Craft Pros — Sprint 01 Data Foundation
-- Migration 0002 — reference tables: data_sources, locations, license_holders,
--   ingestion_runs
-- Idempotent: safe to re-run (IF NOT EXISTS + guarded constraints/triggers).
--
-- ROLLBACK (down): drop in reverse dependency order. license_holders and
--   ingestion_runs are referenced by 0003/0004 tables, so revert 0004, 0003
--   first, then:
--     DROP TABLE IF EXISTS ingestion_runs, license_holders, locations,
--       data_sources CASCADE;
--   Data loss: all rows in these four tables (reference data + run history).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- data_sources — one row per government source file we ingest.
-- A source is a (agency, file) pair, e.g. TDLR Electrical = Lteecele.csv.
-- has_status_field is load-bearing: FALSE means the loader must DERIVE
-- license_status from the expiration date and set verification_level to
-- 'inferred' — never 'authority-confirmed' (spec v2 §5, AGENTS.md rule 3).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_sources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL,              -- 'tdlr-electrical' | 'tdlr-hvac' | 'tsbpe-rmp'
  agency        text NOT NULL,              -- 'TDLR' | 'TSBPE'
  trade         text NOT NULL,              -- 'electrical' | 'hvac' | 'plumbing'
  file_name     text NOT NULL,              -- e.g. 'Lteecele.csv'
  source_url    text,                       -- exact file URL when known; NULL until confirmed
  landing_page_url text,                    -- human-verifiable .gov page for the source
  license_type_label text NOT NULL,         -- value found in the source's LICENSE TYPE column
  has_status_field boolean NOT NULL DEFAULT false,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'data_sources_code_key') THEN
    ALTER TABLE data_sources ADD CONSTRAINT data_sources_code_key UNIQUE (code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'data_sources_trade_check') THEN
    ALTER TABLE data_sources ADD CONSTRAINT data_sources_trade_check
      CHECK (trade IN ('electrical', 'hvac', 'plumbing'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS data_sources_set_updated_at ON data_sources;
CREATE TRIGGER data_sources_set_updated_at
  BEFORE UPDATE ON data_sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE data_sources IS 'Government sources we ingest. has_status_field=false forces inferred verification (never authority-confirmed).';
COMMENT ON COLUMN data_sources.has_status_field IS 'TRUE only if the source file carries its own status column (TSBPE LIC_STATUS). TDLR CSVs have NO status field -> FALSE.';

-- ---------------------------------------------------------------------------
-- locations — state / county / city reference. city_name NULL means a
-- county-level location (the only granularity HVAC data supports: TDLR A/C
-- CSV has 0% business city/address/phone, county only).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code  char(2) NOT NULL DEFAULT 'TX',
  county_name text NOT NULL,
  city_name   text,                         -- NULL = county-level location
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- NULLS NOT DISTINCT (PG 15+): (TX, 'Travis', NULL) is one row, not many.
-- NOTE: NULLS NOT DISTINCT is only valid on a UNIQUE *constraint*, not on
-- CREATE UNIQUE INDEX — hence ALTER TABLE here, not an index.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'locations_state_county_city_uidx') THEN
    ALTER TABLE locations ADD CONSTRAINT locations_state_county_city_uidx
      UNIQUE NULLS NOT DISTINCT (state_code, county_name, city_name);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS locations_county_idx ON locations (county_name);
CREATE INDEX IF NOT EXISTS locations_city_idx ON locations (city_name);

COMMENT ON TABLE locations IS 'State/county/city reference. Rows are created by the ETL from source data; never hand-seeded with county lists (no invented geography).';
COMMENT ON COLUMN locations.city_name IS 'NULL for county-level locations (HVAC: source has county only).';

-- ---------------------------------------------------------------------------
-- license_holders — the person named on the license (TDLR NAME column;
-- RMP LAST_NAME / FIRST_NAME / MIDDLE_NAME / SUFFIX). Kept apart from
-- businesses because one person can hold several licenses and a license
-- belongs to one business but is held by one person.
-- No UNIQUE constraint: source name spellings vary; holder dedupe is out of
-- Sprint 01 scope (see data-model.md open items).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS license_holders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   text NOT NULL,                -- as printed in the source (TDLR NAME, or composed RMP name)
  first_name  text,
  last_name   text,
  middle_name text,
  suffix      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS license_holders_last_name_idx ON license_holders (last_name);
CREATE INDEX IF NOT EXISTS license_holders_full_name_idx ON license_holders (full_name);

DROP TRIGGER IF EXISTS license_holders_set_updated_at ON license_holders;
CREATE TRIGGER license_holders_set_updated_at
  BEFORE UPDATE ON license_holders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE license_holders IS 'People named on licenses. Personal names: NOT exposed to the public role (see 0005 views); the Verify tool displays the business name.';
COMMENT ON COLUMN license_holders.full_name IS 'Name exactly as printed in the source file. No normalization is applied in Sprint 01.';

-- ---------------------------------------------------------------------------
-- ingestion_runs — one row per ETL download+load attempt. The audit anchor
-- for US1/US5: every record traces to a run; every run records source URL,
-- file date, row counts and SHA-256. A re-run of the same file is detected
-- by (source_id, sha256_checksum).
-- contract_version: the data-contract version (etl/contract/) the run's
-- normalized records conform to (e.g. 'v1'). Added per Owner supplement
-- 25/11/2026: every normalized record carries contract_version; the run
-- records which version produced it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingestion_runs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id             uuid NOT NULL REFERENCES data_sources (id),
  contract_version      text NOT NULL DEFAULT 'v1',
  status                text NOT NULL DEFAULT 'running',
  source_url            text,               -- exact URL actually downloaded
  file_date             date,               -- as-of date of the source file, when known
  sha256_checksum       text,               -- SHA-256 of the downloaded bytes
  row_count_downloaded  integer,
  row_count_parsed      integer,
  row_count_loaded      integer,
  row_count_new         integer,
  row_count_changed     integer,
  row_count_disappeared integer,
  started_at            timestamptz NOT NULL DEFAULT now(),
  finished_at           timestamptz,
  error_message         text,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ingestion_runs_status_check') THEN
    ALTER TABLE ingestion_runs ADD CONSTRAINT ingestion_runs_status_check
      CHECK (status IN ('running', 'succeeded', 'failed', 'blocked_anomaly'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ingestion_runs_checksum_format') THEN
    ALTER TABLE ingestion_runs ADD CONSTRAINT ingestion_runs_checksum_format
      CHECK (sha256_checksum IS NULL OR sha256_checksum ~ '^[0-9a-f]{64}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ingestion_runs_counts_nonneg') THEN
    ALTER TABLE ingestion_runs ADD CONSTRAINT ingestion_runs_counts_nonneg
      CHECK (
        (row_count_downloaded IS NULL OR row_count_downloaded >= 0) AND
        (row_count_parsed IS NULL OR row_count_parsed >= 0) AND
        (row_count_loaded IS NULL OR row_count_loaded >= 0) AND
        (row_count_new IS NULL OR row_count_new >= 0) AND
        (row_count_changed IS NULL OR row_count_changed >= 0) AND
        (row_count_disappeared IS NULL OR row_count_disappeared >= 0)
      );
  END IF;
END $$;

-- Same file ingested twice = same run identity (idempotency, US5).
CREATE UNIQUE INDEX IF NOT EXISTS ingestion_runs_source_checksum_uidx
  ON ingestion_runs (source_id, sha256_checksum) WHERE sha256_checksum IS NOT NULL;
CREATE INDEX IF NOT EXISTS ingestion_runs_source_idx ON ingestion_runs (source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ingestion_runs_status_idx ON ingestion_runs (status);

COMMENT ON TABLE ingestion_runs IS 'One row per ETL download+load attempt. Traceability anchor: every license row points here via ingestion_run_id.';
COMMENT ON COLUMN ingestion_runs.contract_version IS 'Data-contract version (etl/contract/normalized-record.<version>.json) the run normalized against. Every normalized record carries this value.';
COMMENT ON COLUMN ingestion_runs.sha256_checksum IS 'SHA-256 of the downloaded source bytes. Re-ingesting the same checksum must be a no-op (US5).';
COMMENT ON COLUMN ingestion_runs.status IS 'blocked_anomaly means the anomaly check stopped publication before load (US5).';

COMMIT;
