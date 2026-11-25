-- =============================================================================
-- House Craft Pros — Sprint 01 Data Foundation
-- Migration 0006 — seed data_sources (the 3 government sources, Sprint 01)
-- Idempotent: INSERT ... ON CONFLICT (code) DO NOTHING — safe to re-run.
--
-- Provenance of every value below (no invented data):
--   * File names + row counts + field realities: research/data-findings-
--     2026-11-24.md (verified 24/11/2026 from the downloaded CSVs).
--   * TSBPE landing page https://tsbpe.texas.gov/free-licensee-list/ — taken
--     verbatim from the saved page research/tsbpe_list.html.
--   * TDLR source_url is intentionally the TDLR home page
--     (https://www.tdlr.texas.gov/, present in the saved research page):
--     the exact licfile.asp file URL was NOT in the research files, so it is
--     NOT guessed here. The exact URL actually downloaded is recorded per
--     run in ingestion_runs.source_url at download time (see
--     docs/architecture/etl-pipeline.md [NEEDS CLARIFICATION] NC-1).
--   * has_status_field: FALSE for both TDLR CSVs (no status column in the
--     headers), TRUE for TSBPE RMP (LIC_STATUS column: Current/Expired).
--
-- ROLLBACK (down):
--     DELETE FROM data_sources WHERE code IN
--       ('tdlr-electrical','tdlr-hvac','tsbpe-rmp');
--   Only safe when no ingestion_runs/licenses reference them (fresh DB).
--   Data loss: the 3 seed rows.
-- =============================================================================

BEGIN;

INSERT INTO data_sources
  (code, agency, trade, file_name, source_url, landing_page_url,
   license_type_label, has_status_field, notes)
VALUES
  ('tdlr-electrical', 'TDLR', 'electrical', 'Lteecele.csv',
   'https://www.tdlr.texas.gov/',
   'https://www.tdlr.texas.gov/',
   'Electrical Contractor', false,
   'TDLR Electrical Contractors CSV. No status field: status derived from LICENSE EXPIRATION DATE, verification_level=inferred. 14,067 rows in the 24/11/2026 copy; 100% business phone/address/city/ZIP/county.'),
  ('tdlr-hvac', 'TDLR', 'hvac', 'ltairref.csv',
   'https://www.tdlr.texas.gov/',
   'https://www.tdlr.texas.gov/',
   'A/C Contractor', false,
   'TDLR A/C Contractors CSV. No status field: status derived from LICENSE EXPIRATION DATE, verification_level=inferred. 20,497 rows in the 24/11/2026 copy; BUSINESS PHONE / ADDRESS / CITY / ZIP all 0% — county only (BUSINESS COUNTY 96%).'),
  ('tsbpe-rmp', 'TSBPE', 'plumbing', 'rmp_download',
   'https://tsbpe.texas.gov/free-licensee-list/',
   'https://tsbpe.texas.gov/free-licensee-list/',
   'Responsible Master Plumber', true,
   'TSBPE Responsible Master Plumber free licensee list. HAS status field LIC_STATUS (Current/Expired): verification_level=authority-confirmed for the status value itself. 9,416 rows in the 24/11/2026 copy; PHONE ~50%, PLUMB_COMPANY 100%.')
ON CONFLICT (code) DO NOTHING;

COMMIT;
