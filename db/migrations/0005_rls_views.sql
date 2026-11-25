-- =============================================================================
-- House Craft Pros — Sprint 01 Data Foundation
-- Migration 0005 — Row Level Security + public views + grants
-- Idempotent: safe to re-run (DROP POLICY IF EXISTS / OR REPLACE VIEW).
--
-- ACCESS MODEL (US6; spec v2 §6.5):
--   * RLS is ENABLED on every base table. Default posture is deny: the anon
--     role gets an explicit USING (false) policy on base tables, so a direct
--     table read by the public role returns nothing even if a GRANT is added
--     by mistake later.
--   * The ONLY public read path is the views below (v_public_businesses,
--     v_public_licenses, v_seo_indexable_licenses). Views run as their owner
--     (the migration role) and expose ONLY publishable fields of publishable
--     rows; GRANT SELECT on the views is given to app_anon.
--   * app_admin (server-side ETL + admin API; Supabase service_role
--     equivalent) gets full access via USING (true) policies, EXCEPT:
--       - audit_logs and license_status_history are append-only: no UPDATE
--         or DELETE grants for app_admin (history is evidence, never edited).
--   * PII handling: license holder personal names live in license_holders
--     and are NOT in any public view (the Verify tool displays the business
--     name). Business phone is withheld from public views when
--     businesses.phone_withheld_for_legal_review is TRUE (sole-proprietor
--     personal phone pending lawyer review, spec v2 §6.5).
--   * claims / correction_requests: claimant/requester contact details are
--     never exposed publicly (no view, no anon access).
--   * Supabase mapping: app_anon <-> anon role; app_admin <-> service_role.
--     In Supabase, the same policies apply; the views must be created with
--     the same owner/grants. The RLS policies here use `current_setting`
--     -free role checks (TO app_anon / TO app_admin), which Supabase honors.
--
-- OPTIONAL Supabase-only section (NOT executed by plain Postgres — the block
-- below is commented out; uncomment only when applying to Supabase):
--   -- ALTER TABLE <t> ENABLE ROW LEVEL SECURITY; -- (already done below)
--   -- Supabase Auth: create the admin user in the dashboard; never store
--   -- the service_role key in the repo or in app code shipped to the browser.
--
-- ROLLBACK (down):
--     DROP VIEW IF EXISTS v_seo_indexable_licenses, v_public_licenses,
--       v_public_businesses;
--     -- then, per table: DROP POLICY IF EXISTS <policy> ON <table>;
--     -- ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;
--     -- REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_anon, app_admin;
--   Data loss: none (views/policies only; no rows are touched).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Enable RLS on every base table (14 tables).
-- ---------------------------------------------------------------------------
ALTER TABLE data_sources            ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations               ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_holders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_runs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_status_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE correction_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_batches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE dedupe_decisions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_conflicts        ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. Policies. Two per table: anon = deny-all; admin = full.
--    (Admin write path is server-side only; the browser never holds app_admin.)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'data_sources','locations','license_holders','ingestion_runs',
    'businesses','licenses','license_status_history','claims',
    'correction_requests','publication_batches','publication_batch_items',
    'audit_logs','dedupe_decisions','source_conflicts'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_anon_deny ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_anon_deny ON %I FOR ALL TO app_anon USING (false)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_admin_all ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_admin_all ON %I FOR ALL TO app_admin USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Grants on base tables: admin only. Anon gets NOTHING on base tables.
--    Append-only tables: no UPDATE/DELETE for admin either.
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  data_sources, locations, license_holders, ingestion_runs,
  businesses, licenses, claims, correction_requests,
  publication_batches, publication_batch_items,
  dedupe_decisions, source_conflicts
  TO app_admin;
GRANT SELECT, INSERT ON license_status_history, audit_logs TO app_admin;
REVOKE UPDATE, DELETE ON license_status_history, audit_logs FROM app_admin;
GRANT USAGE ON SCHEMA public TO app_anon, app_admin;

-- ---------------------------------------------------------------------------
-- 4. Public views — the ONLY public read path (US6).
--    A row is public only when its GATE 1 timestamp is set, and a business is
--    public only when its own GATE 1 is set. Disappeared licenses stay
--    visible (flagged) so Verify can return them as "no longer in the source"
--    instead of "not found" (US4). Expired licenses stay visible (US4).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_public_businesses AS
SELECT
  b.id,
  b.name,
  b.slug,
  CASE WHEN b.phone_withheld_for_legal_review THEN NULL ELSE b.phone END AS phone,
  b.address_line1,
  b.address_line2,
  b.city,
  b.state_code,
  b.zip,
  b.county,
  b.data_published_at
FROM businesses b
WHERE b.data_published_at IS NOT NULL;

COMMENT ON VIEW v_public_businesses IS 'Public directory view (GATE 1 only). Phone is NULL when withheld for legal review. No holder names, no internal dedupe fields.';

CREATE OR REPLACE VIEW v_public_licenses AS
SELECT
  l.id,
  l.license_number,
  l.license_type,
  l.license_subtype,
  l.trade,
  l.license_status,
  l.verification_level,
  l.license_status_source,
  l.status_as_of,
  l.expiration_date,
  l.issue_date,
  l.endorsements,
  l.county,
  l.disappeared_from_source,
  l.data_published_at,
  b.id AS business_id,
  b.name AS business_name,
  b.slug AS business_slug,
  CASE WHEN b.phone_withheld_for_legal_review THEN NULL ELSE b.phone END AS business_phone,
  b.city AS business_city,
  b.state_code AS business_state,
  b.zip AS business_zip,
  s.agency AS source_agency,
  s.code AS source_code,
  s.landing_page_url AS source_lookup_url
FROM licenses l
JOIN businesses b ON b.id = l.business_id
JOIN data_sources s ON s.id = l.source_id
WHERE l.data_published_at IS NOT NULL
  AND b.data_published_at IS NOT NULL;

COMMENT ON VIEW v_public_licenses IS 'Public Verify-tool view (GATE 1 only). Both license and business must be data-published. Expired and disappeared licenses are INCLUDED (flagged) — Verify never answers "not found" for a license that existed. Holder personal names are NOT exposed.';

-- SEO gate view: consumed by the Sprint 03 sitemap-index builder. The view
-- is the GATE, not the quality rule: the thin-page rule (enough signals to
-- index) is applied by the sitemap builder on top of this view.
CREATE OR REPLACE VIEW v_seo_indexable_licenses AS
SELECT
  l.id,
  l.license_number,
  l.license_type,
  l.trade,
  b.id AS business_id,
  b.name AS business_name,
  b.slug AS business_slug,
  b.city AS business_city,
  b.county AS business_county,
  l.seo_index_published_at
FROM licenses l
JOIN businesses b ON b.id = l.business_id
WHERE l.seo_index_published_at IS NOT NULL
  AND b.seo_index_published_at IS NOT NULL;

COMMENT ON VIEW v_seo_indexable_licenses IS 'SEO gate view (GATE 2 only). Feeds the sitemap index (Sprint 03). The thin-page quality rule is applied by the sitemap builder, not by this view.';

GRANT SELECT ON v_public_businesses, v_public_licenses, v_seo_indexable_licenses TO app_anon;
GRANT SELECT ON v_public_businesses, v_public_licenses, v_seo_indexable_licenses TO app_admin;

COMMIT;
