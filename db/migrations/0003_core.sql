-- =============================================================================
-- House Craft Pros — Sprint 01 Data Foundation
-- Migration 0003 — core tables: businesses, licenses, license_status_history
-- Idempotent: safe to re-run (IF NOT EXISTS + guarded constraints/triggers).
--
-- THE SPLIT (spec v2 §5, Sprint 01 US2 — do not collapse these two columns):
--   licenses.license_status     — the LICENSE's own status, as reported by the
--     authority or derived from its expiration date:
--     active / expired / suspended / revoked / cancelled / pending / inactive
--     / unknown.
--   licenses.verification_level — OUR confidence in that status:
--     authority-confirmed / inferred / unverified.
--   TDLR CSVs have NO status field: status derived from expiration_date and
--   verification_level is ALWAYS 'inferred' for those rows. TSBPE RMP HAS a
--   status field (Current/Expired): verification_level may be
--   'authority-confirmed' for the status value itself — never for the
--   business identity. Nothing is displayed as "Verified" unless
--   verification_level = 'authority-confirmed' with recorded evidence.
--
-- THE TWO PUBLICATION GATES (plan.md; AGENTS.md rule 4):
--   data_published_at     — record visible in the Verify tool / directory data.
--   seo_index_published_at — record's URL in the sitemap index + indexable.
--   Each gate is an independent nullable timestamp on the row, so one record
--   can be data-published without being SEO-published. Batch membership is
--   recorded in publication_batch_items (0004) for precise rollback.
--
-- ROLLBACK (down): revert 0005, 0004 first (they reference these tables), then:
--     DROP TABLE IF EXISTS license_status_history, licenses, businesses CASCADE;
--   Data loss: all business/license/history rows.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- businesses — deduped business identity. One business <-> many licenses.
-- Dedupe rule (US3, conservative): merge ONLY on name + address/phone
-- evidence; name-only clusters are held for human review (dedupe_decisions,
-- decision='held_ambiguous') and never auto-merged.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS businesses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,            -- display name, as printed in the source
  normalized_name text NOT NULL,            -- lowercased, punctuation/whitespace-collapsed; dedupe + search key
  slug            text,                     -- URL slug for /contractors/[slug]/; set at publication time
  phone           text,                     -- business phone as printed (may be a personal phone: see phone_withheld_for_legal_review)
  phone_normalized text,                    -- digits only (US 10-digit when parseable); NULL when source has none
  address_line1   text,
  address_line2   text,
  city            text,
  state_code      char(2) NOT NULL DEFAULT 'TX',
  zip             text,
  county          text,                     -- business county as printed in the source
  location_id     uuid REFERENCES locations (id),
  dedupe_status   text NOT NULL DEFAULT 'single',
  phone_withheld_for_legal_review boolean NOT NULL DEFAULT false,
  data_published_at      timestamptz,       -- GATE 1: visible in Verify tool / directory data
  seo_index_published_at timestamptz,       -- GATE 2: URL in sitemap index + indexable
  first_seen_run_id uuid REFERENCES ingestion_runs (id),
  last_seen_run_id  uuid REFERENCES ingestion_runs (id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_dedupe_status_check') THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_dedupe_status_check
      CHECK (dedupe_status IN ('single', 'merged', 'ambiguous_held'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_slug_key') THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_slug_key UNIQUE (slug);
  END IF;
END $$;

-- NOTE: businesses_slug_key is a plain UNIQUE constraint, so multiple NULL
-- slugs are allowed (Postgres treats NULLs as distinct) — correct, because
-- the slug is only set when a business is prepared for publication.
CREATE INDEX IF NOT EXISTS businesses_normalized_name_idx ON businesses (normalized_name);
CREATE INDEX IF NOT EXISTS businesses_phone_normalized_idx ON businesses (phone_normalized);
CREATE INDEX IF NOT EXISTS businesses_county_idx ON businesses (county);
CREATE INDEX IF NOT EXISTS businesses_city_idx ON businesses (city);
CREATE INDEX IF NOT EXISTS businesses_data_published_idx ON businesses (data_published_at) WHERE data_published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS businesses_seo_published_idx ON businesses (seo_index_published_at) WHERE seo_index_published_at IS NOT NULL;

DROP TRIGGER IF EXISTS businesses_set_updated_at ON businesses;
CREATE TRIGGER businesses_set_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE businesses IS 'Deduped business identity. One business holds many licenses. Counts of businesses are ALWAYS smaller than counts of licenses (one business, many licenses).';
COMMENT ON COLUMN businesses.normalized_name IS 'Dedupe/search key: name lowercased, punctuation stripped, whitespace collapsed. Never display this value.';
COMMENT ON COLUMN businesses.dedupe_status IS 'merged means created by merging 2+ license rows (see dedupe_decisions). ambiguous_held means a name-only cluster held for human review, never auto-merged.';
COMMENT ON COLUMN businesses.phone_withheld_for_legal_review IS 'TRUE hides the phone from every public view until a lawyer review clears republication of a sole proprietor personal phone (spec v2 §6.5). Default FALSE; set only by human/legal review, never by the ETL.';
COMMENT ON COLUMN businesses.data_published_at IS 'GATE 1 (data publication): non-NULL = business visible in Verify tool / directory data.';
COMMENT ON COLUMN businesses.seo_index_published_at IS 'GATE 2 (SEO index publication): non-NULL = business profile URL in the sitemap index and indexable. Independent of GATE 1.';

-- ---------------------------------------------------------------------------
-- licenses — one row per government license. The normalized record persisted
-- (see etl/contract/normalized-record.v1.json). Identity:
-- UNIQUE (source_id, license_type, license_number).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS licenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES businesses (id),
  holder_id       uuid REFERENCES license_holders (id),
  source_id       uuid NOT NULL REFERENCES data_sources (id),
  ingestion_run_id uuid REFERENCES ingestion_runs (id),
  contract_version text NOT NULL DEFAULT 'v1',
  trade           text NOT NULL,            -- 'electrical' | 'hvac' | 'plumbing'
  license_type    text NOT NULL,            -- source LICENSE TYPE, e.g. 'Electrical Contractor', 'A/C Contractor', 'Responsible Master Plumber'
  license_subtype text,                     -- TDLR LICENSE SUBTYPE (EC; AC/AE/BE/BC/AR/BR/...); NULL for RMP
  license_number  text NOT NULL,            -- as printed; lengths vary (TDLR elec 5 chars; HVAC 3-6; RMP 1-5) — never assume a fixed length
  expiration_date date,                     -- source LICENSE EXPIRATION DATE / EXPIRATION_DTE; NULL only if the source lacks it
  issue_date      date,                     -- RMP LICENSE_DATE; NULL for TDLR (no issue date in CSV)
  -- THE SPLIT: status vs confidence. See header comment.
  license_status  text NOT NULL,            -- active / expired / suspended / revoked / cancelled / pending / inactive / unknown
  verification_level text NOT NULL,         -- authority-confirmed / inferred / unverified
  license_status_source text NOT NULL,      -- 'source_field' | 'expiration_date' | 'gov_lookup' | 'unknown'
  status_as_of    date NOT NULL,            -- date of the source file / run the status was derived from
  endorsements    jsonb NOT NULL DEFAULT '[]'::jsonb, -- RMP MEDGAS/MRF/WS endorsements, e.g. ["MEDGAS","WS"]; [] otherwise
  insurance_company text,                   -- RMP INSURANCE_COMPANY
  insurance_expiry_date date,               -- RMP INS_EXPIRY_DTE
  county          text,                     -- license county as printed (BUSINESS COUNTY / COUNTY); denormalized for lookup
  location_id     uuid REFERENCES locations (id),
  disappeared_from_source boolean NOT NULL DEFAULT false,
  disappeared_at  timestamptz,
  data_published_at      timestamptz,       -- GATE 1 (see businesses)
  seo_index_published_at timestamptz,       -- GATE 2 (see businesses)
  first_seen_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'licenses_identity_key') THEN
    ALTER TABLE licenses ADD CONSTRAINT licenses_identity_key
      UNIQUE (source_id, license_type, license_number);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'licenses_trade_check') THEN
    ALTER TABLE licenses ADD CONSTRAINT licenses_trade_check
      CHECK (trade IN ('electrical', 'hvac', 'plumbing'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'licenses_status_check') THEN
    ALTER TABLE licenses ADD CONSTRAINT licenses_status_check
      CHECK (license_status IN ('active','expired','suspended','revoked','cancelled','pending','inactive','unknown'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'licenses_verification_check') THEN
    ALTER TABLE licenses ADD CONSTRAINT licenses_verification_check
      CHECK (verification_level IN ('authority-confirmed','inferred','unverified'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'licenses_status_source_check') THEN
    ALTER TABLE licenses ADD CONSTRAINT licenses_status_source_check
      CHECK (license_status_source IN ('source_field','expiration_date','gov_lookup','unknown'));
  END IF;
  -- A row whose status came from a source status field must not claim a
  -- derivation it did not use, and vice versa. The critical invariant:
  -- TDLR rows (no status field) are NEVER authority-confirmed.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'licenses_inferred_rule') THEN
    ALTER TABLE licenses ADD CONSTRAINT licenses_inferred_rule
      CHECK (
        (license_status_source = 'expiration_date' AND verification_level <> 'authority-confirmed')
        OR (license_status_source <> 'expiration_date')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'licenses_disappeared_consistent') THEN
    ALTER TABLE licenses ADD CONSTRAINT licenses_disappeared_consistent
      CHECK (
        (disappeared_from_source = false AND disappeared_at IS NULL)
        OR (disappeared_from_source = true AND disappeared_at IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS licenses_number_idx ON licenses (license_number);
CREATE INDEX IF NOT EXISTS licenses_business_idx ON licenses (business_id);
CREATE INDEX IF NOT EXISTS licenses_trade_idx ON licenses (trade);
CREATE INDEX IF NOT EXISTS licenses_status_idx ON licenses (license_status);
CREATE INDEX IF NOT EXISTS licenses_verification_idx ON licenses (verification_level);
CREATE INDEX IF NOT EXISTS licenses_county_idx ON licenses (county);
CREATE INDEX IF NOT EXISTS licenses_expiration_idx ON licenses (expiration_date);
CREATE INDEX IF NOT EXISTS licenses_data_published_idx ON licenses (data_published_at) WHERE data_published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS licenses_seo_published_idx ON licenses (seo_index_published_at) WHERE seo_index_published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS licenses_source_run_idx ON licenses (source_id, ingestion_run_id);

DROP TRIGGER IF EXISTS licenses_set_updated_at ON licenses;
CREATE TRIGGER licenses_set_updated_at
  BEFORE UPDATE ON licenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE licenses IS 'One row per government license. Identity is (source_id, license_type, license_number). Expired licenses are loaded and kept queryable — never filtered out before load.';
COMMENT ON COLUMN licenses.license_status IS 'The LICENSE own status. TDLR: derived from expiration_date (active if not expired, expired if past). TSBPE: from LIC_STATUS (Current->active, Expired->expired).';
COMMENT ON COLUMN licenses.verification_level IS 'OUR confidence in license_status. authority-confirmed = source status field or .gov lookup. inferred = derived from expiration date (all TDLR rows). unverified = not enough data (e.g. no expiration date, conflicting sources).';
COMMENT ON COLUMN licenses.license_status_source IS 'How license_status was derived. expiration_date rows can never be authority-confirmed (enforced by licenses_inferred_rule).';
COMMENT ON COLUMN licenses.contract_version IS 'Data-contract version (etl/contract/) this persisted normalized record conforms to. Denormalized from ingestion_runs.contract_version for queryability.';
COMMENT ON COLUMN licenses.disappeared_from_source IS 'TRUE when the license was present in an earlier run but absent from the latest source file. Never delete the row; Verify must still be able to return it (marked disappeared).';
COMMENT ON COLUMN licenses.endorsements IS 'RMP endorsements as a JSON array of codes, e.g. ["MEDGAS","WS"]. Empty array for sources without endorsements.';
COMMENT ON COLUMN licenses.data_published_at IS 'GATE 1 (data publication): non-NULL = license visible in Verify tool / directory data.';
COMMENT ON COLUMN licenses.seo_index_published_at IS 'GATE 2 (SEO index publication): non-NULL = license profile URL in the sitemap index and indexable. Independent of GATE 1.';

-- ---------------------------------------------------------------------------
-- license_status_history — every status/verification change, including the
-- initial load (previous_* NULL, change_reason='initial_load') and
-- disappearance/reappearance. Append-only in practice (no UPDATE/DELETE
-- grants for app_admin — see 0005).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS license_status_history (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id                uuid NOT NULL REFERENCES licenses (id),
  previous_status           text,
  new_status                text NOT NULL,
  previous_verification_level text,
  new_verification_level    text,
  change_reason             text NOT NULL,
  run_id                    uuid REFERENCES ingestion_runs (id),
  changed_at                timestamptz NOT NULL DEFAULT now(),
  notes                     text
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'license_status_history_reason_check') THEN
    ALTER TABLE license_status_history ADD CONSTRAINT license_status_history_reason_check
      CHECK (change_reason IN ('initial_load','expiration_passed','source_status_change','disappeared_from_source','reappeared_in_source','correction','gov_lookup'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'license_status_history_new_status_check') THEN
    ALTER TABLE license_status_history ADD CONSTRAINT license_status_history_new_status_check
      CHECK (new_status IN ('active','expired','suspended','revoked','cancelled','pending','inactive','unknown'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS license_status_history_license_idx ON license_status_history (license_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS license_status_history_run_idx ON license_status_history (run_id);

COMMENT ON TABLE license_status_history IS 'Full status history per license. Every load that changes status (or finds a disappearance) appends exactly one row; unchanged records get NO new row (idempotency, US5).';

COMMIT;
