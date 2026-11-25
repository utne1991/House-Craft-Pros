-- =============================================================================
-- House Craft Pros — Sprint 01 Data Foundation
-- Migration 0001 — roles + shared functions
-- PostgreSQL 16. Canonical source: PostgreSQL (see ADR-0002).
-- Idempotent: safe to re-run (guards on every object).
--
-- ROLLBACK (down): there is no automatic down migration. To revert this file
--   only, drop the trigger function and the two roles — ONLY if no other
--   migration objects depend on them (0002+ depend on both roles existing
--   for GRANTs, so in practice revert 0005..0002 first, then this file):
--     DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
--     DROP ROLE IF EXISTS app_anon; DROP ROLE IF EXISTS app_admin;
--   Data loss: none (no tables are created by this file).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Roles (application-level; map to Supabase in production — see data-model.md)
--   app_anon  : public / unauthenticated web reads. NEVER writes. Reads ONLY
--               through the public views created in 0005 (v_public_*).
--   app_admin : server-side ETL + admin API (Supabase service_role equivalent).
--               Full read/write on base tables, except audit_logs (append-only).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_anon') THEN
    CREATE ROLE app_anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin NOLOGIN;
  END IF;
END $$;

COMMENT ON ROLE app_anon IS 'Public read role: SELECT only, via public views (v_public_*). No base-table access.';
COMMENT ON ROLE app_admin IS 'Server-side role (ETL + admin API): full read/write on base tables; audit_logs append-only.';

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at current on UPDATE.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_updated_at() IS 'Trigger function: sets NEW.updated_at = now() on UPDATE. Attached per-table in later migrations.';

COMMIT;
