-- =============================================================================
-- House Craft Pros — Sprint 01 Data Foundation
-- Migration 0004 — workflow tables: claims, correction_requests,
--   publication_batches, publication_batch_items (PROPOSED), audit_logs,
--   dedupe_decisions (PROPOSED), source_conflicts (PROPOSED)
-- Idempotent: safe to re-run (IF NOT EXISTS + guarded constraints/triggers).
--
-- PROPOSED TABLES (not in spec v2 §4's 11; each has a technical reason —
-- see docs/architecture/data-model.md §5):
--   publication_batch_items — precise per-record batch membership, so a bad
--     batch can be rolled back exactly (US5). Per-record gate timestamps
--     alone cannot answer "which batch published this record".
--   dedupe_decisions — US3 requires every merge decision recorded and every
--     name-only cluster held for human review. No spec-v2 table holds a
--     decision (who, what, why, when) — businesses only holds the outcome.
--   source_conflicts — US4 requires cross-source disagreement recorded with
--     neither value silently overwriting the other. license_status_history
--     records changes over time, not a disagreement at one point in time.
--
-- ROLLBACK (down): revert 0005 first, then:
--     DROP TABLE IF EXISTS source_conflicts, dedupe_decisions, audit_logs,
--       publication_batch_items, publication_batches, correction_requests,
--       claims CASCADE;
--   Data loss: all rows in these seven tables (claims/requests/batches/logs).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- claims — business-claim requests. Verified by MANUAL phone call only
-- (never bulk SMS: TCPA + Texas SB 140). Deliberately NO email column:
-- the claim form must not collect excess email (spec v2 §6.5).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claims (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES businesses (id),
  claimant_name   text NOT NULL,
  claimant_phone  text NOT NULL,            -- used for the manual verification call
  relationship    text NOT NULL,            -- e.g. 'owner' | 'employee' | 'authorized_representative'
  status          text NOT NULL DEFAULT 'pending',
  verified_by     text,                     -- who made the verification call
  verified_at     timestamptz,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claims_status_check') THEN
    ALTER TABLE claims ADD CONSTRAINT claims_status_check
      CHECK (status IN ('pending','in_review','verified','rejected'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'claims_verified_consistent') THEN
    ALTER TABLE claims ADD CONSTRAINT claims_verified_consistent
      CHECK ((status = 'verified' AND verified_at IS NOT NULL) OR (status <> 'verified'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS claims_business_idx ON claims (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS claims_status_idx ON claims (status);

DROP TRIGGER IF EXISTS claims_set_updated_at ON claims;
CREATE TRIGGER claims_set_updated_at
  BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE claims IS 'Business-claim requests. Verification is by manual phone call only — never bulk SMS (TCPA + Texas SB 140). No email column by design (no excess collection).';
COMMENT ON COLUMN claims.claimant_phone IS 'Claimant phone, used ONLY for the manual verification call. Never published, never used for marketing.';

-- ---------------------------------------------------------------------------
-- correction_requests — requests to correct or remove data (incl. Remove
-- Listing page). At least one of business_id / license_id must be set.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS correction_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid REFERENCES businesses (id),
  license_id      uuid REFERENCES licenses (id),
  requester_name  text,
  requester_phone text,
  request_type    text NOT NULL,            -- 'correction' | 'removal' | 'other'
  details         text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'correction_requests_type_check') THEN
    ALTER TABLE correction_requests ADD CONSTRAINT correction_requests_type_check
      CHECK (request_type IN ('correction','removal','other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'correction_requests_status_check') THEN
    ALTER TABLE correction_requests ADD CONSTRAINT correction_requests_status_check
      CHECK (status IN ('pending','in_review','resolved','rejected'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'correction_requests_target_check') THEN
    ALTER TABLE correction_requests ADD CONSTRAINT correction_requests_target_check
      CHECK (business_id IS NOT NULL OR license_id IS NOT NULL);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS correction_requests_business_idx ON correction_requests (business_id);
CREATE INDEX IF NOT EXISTS correction_requests_license_idx ON correction_requests (license_id);
CREATE INDEX IF NOT EXISTS correction_requests_status_idx ON correction_requests (status);

DROP TRIGGER IF EXISTS correction_requests_set_updated_at ON correction_requests;
CREATE TRIGGER correction_requests_set_updated_at
  BEFORE UPDATE ON correction_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE correction_requests IS 'Requests to correct or remove a listing. A removal request never deletes the license row outright — removal is a publication-gate decision (clear the gate timestamps), preserving history.';

-- ---------------------------------------------------------------------------
-- publication_batches — one row per publication event. The batch opens one
-- or both gates for its member records:
--   data_published_at      — when this batch opened GATE 1 (data) for members
--   seo_index_published_at — when this batch opened GATE 2 (SEO index)
-- gate_scope records which gate(s) the batch was created to open.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS publication_batches (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL,    -- e.g. 'batch-2026-11-25-guides+tool', 'batch-2026-12-01-city-pages'
  gate_scope              text NOT NULL,    -- 'data' | 'seo_index' | 'both'
  status                  text NOT NULL DEFAULT 'draft',
  record_count            integer NOT NULL DEFAULT 0,
  data_published_at       timestamptz,      -- batch-level: when GATE 1 opened for this batch
  seo_index_published_at  timestamptz,      -- batch-level: when GATE 2 opened for this batch
  created_by              text,
  approved_by             text,
  rolled_back_at          timestamptz,
  rolled_back_to_batch_id uuid REFERENCES publication_batches (id),
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'publication_batches_scope_check') THEN
    ALTER TABLE publication_batches ADD CONSTRAINT publication_batches_scope_check
      CHECK (gate_scope IN ('data','seo_index','both'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'publication_batches_status_check') THEN
    ALTER TABLE publication_batches ADD CONSTRAINT publication_batches_status_check
      CHECK (status IN ('draft','approved','published','rolled_back'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'publication_batches_gates_consistent') THEN
    ALTER TABLE publication_batches ADD CONSTRAINT publication_batches_gates_consistent
      CHECK (
        (gate_scope = 'data' AND seo_index_published_at IS NULL)
        OR (gate_scope = 'seo_index' AND data_published_at IS NULL)
        OR (gate_scope = 'both')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'publication_batches_count_nonneg') THEN
    ALTER TABLE publication_batches ADD CONSTRAINT publication_batches_count_nonneg
      CHECK (record_count >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS publication_batches_status_idx ON publication_batches (status, created_at DESC);

DROP TRIGGER IF EXISTS publication_batches_set_updated_at ON publication_batches;
CREATE TRIGGER publication_batches_set_updated_at
  BEFORE UPDATE ON publication_batches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE publication_batches IS 'Publication events. One batch opens one or both gates for its member records (see publication_batch_items). Rollback = revert to the prior batch, recorded in rolled_back_to_batch_id.';
COMMENT ON COLUMN publication_batches.data_published_at IS 'GATE 1 at batch level: when this batch made its members visible in Verify tool / directory data.';
COMMENT ON COLUMN publication_batches.seo_index_published_at IS 'GATE 2 at batch level: when this batch put its members URLs in the sitemap index. Independent of GATE 1.';

-- ---------------------------------------------------------------------------
-- publication_batch_items (PROPOSED) — which record, which batch, which gate.
-- This is what makes rollback exact: reverting a batch clears the gate
-- timestamp ONLY on rows listed here for that batch+gate.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS publication_batch_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    uuid NOT NULL REFERENCES publication_batches (id),
  license_id  uuid REFERENCES licenses (id),
  business_id uuid REFERENCES businesses (id),
  gate        text NOT NULL,                -- 'data' | 'seo_index'
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'publication_batch_items_gate_check') THEN
    ALTER TABLE publication_batch_items ADD CONSTRAINT publication_batch_items_gate_check
      CHECK (gate IN ('data','seo_index'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'publication_batch_items_target_check') THEN
    ALTER TABLE publication_batch_items ADD CONSTRAINT publication_batch_items_target_check
      CHECK (license_id IS NOT NULL OR business_id IS NOT NULL);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS publication_batch_items_license_uidx
  ON publication_batch_items (batch_id, license_id, gate) WHERE license_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS publication_batch_items_business_uidx
  ON publication_batch_items (batch_id, business_id, gate) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS publication_batch_items_batch_idx ON publication_batch_items (batch_id);

COMMENT ON TABLE publication_batch_items IS 'PROPOSED (not in spec v2 11-table list). Precise batch membership per record+gate — the rollback mechanism. Without it, a bad batch can only be reverted by timestamp guessing.';

-- ---------------------------------------------------------------------------
-- audit_logs — append-only evidence of changes (who did what, when, to which
-- record, old vs new values). No UPDATE/DELETE grants for app_admin (0005).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor       text NOT NULL,                -- 'etl' | 'admin:<identifier>' | 'system'
  action      text NOT NULL,                -- e.g. 'license.upsert', 'batch.publish', 'claim.verify'
  table_name  text NOT NULL,
  record_id   uuid,
  old_values  jsonb,
  new_values  jsonb,
  run_id      uuid REFERENCES ingestion_runs (id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_record_idx ON audit_logs (table_name, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_run_idx ON audit_logs (run_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs (actor, created_at DESC);

COMMENT ON TABLE audit_logs IS 'Append-only change evidence. UPDATE/DELETE are revoked for app_admin (see 0005) — history is never rewritten.';
COMMENT ON COLUMN audit_logs.old_values IS 'Pre-change snapshot (JSON). NULL for inserts. Must never contain secrets; phone numbers are business data from public CSVs, not user secrets.';

-- ---------------------------------------------------------------------------
-- dedupe_decisions (PROPOSED) — the record of every dedupe decision (US3).
-- 'merged'        = >=2 license rows merged into one business (business_id set).
-- 'held_ambiguous'= name-only cluster, NOT auto-merged, awaiting human review.
-- 'rejected_no_merge' = reviewed and decided NOT to merge.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dedupe_decisions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid REFERENCES ingestion_runs (id),
  cluster_key   text NOT NULL,              -- normalized-name key the candidates grouped under
  license_ids   uuid[] NOT NULL,            -- candidate license rows (by id)
  business_id   uuid REFERENCES businesses (id), -- set when decision='merged'
  decision      text NOT NULL,
  rationale     text NOT NULL,              -- why: which evidence matched / what was missing
  decided_by    text NOT NULL DEFAULT 'etl',-- 'etl' | 'human:<identifier>'
  decided_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dedupe_decisions_decision_check') THEN
    ALTER TABLE dedupe_decisions ADD CONSTRAINT dedupe_decisions_decision_check
      CHECK (decision IN ('merged','held_ambiguous','rejected_no_merge'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dedupe_decisions_merged_consistent') THEN
    ALTER TABLE dedupe_decisions ADD CONSTRAINT dedupe_decisions_merged_consistent
      CHECK ((decision = 'merged' AND business_id IS NOT NULL) OR (decision <> 'merged'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dedupe_decisions_cluster_nonempty') THEN
    ALTER TABLE dedupe_decisions ADD CONSTRAINT dedupe_decisions_cluster_nonempty
      CHECK (cardinality(license_ids) >= 2);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS dedupe_decisions_cluster_idx ON dedupe_decisions (cluster_key);
CREATE INDEX IF NOT EXISTS dedupe_decisions_decision_idx ON dedupe_decisions (decision, decided_at DESC);

COMMENT ON TABLE dedupe_decisions IS 'PROPOSED (not in spec v2 11-table list). Every dedupe decision with evidence and decider. Name-only clusters land here as held_ambiguous and are never auto-merged (US3).';

-- ---------------------------------------------------------------------------
-- source_conflicts (PROPOSED) — cross-source disagreement about one license
-- (US4). Neither value silently overwrites the other: both are stored, the
-- license row keeps the previously loaded value, and the conflict stays
-- 'open' until a human resolves it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS source_conflicts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id      uuid REFERENCES licenses (id),
  license_number  text NOT NULL,
  license_type    text NOT NULL,
  field_name      text NOT NULL,            -- e.g. 'license_status', 'expiration_date', 'business_name'
  value_a         text,
  value_b         text,
  source_a_id     uuid REFERENCES data_sources (id),
  source_b_id     uuid REFERENCES data_sources (id),
  status          text NOT NULL DEFAULT 'open',
  resolution_notes text,
  run_id          uuid REFERENCES ingestion_runs (id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'source_conflicts_status_check') THEN
    ALTER TABLE source_conflicts ADD CONSTRAINT source_conflicts_status_check
      CHECK (status IN ('open','resolved_a','resolved_b','resolved_manual','ignored'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'source_conflicts_resolved_consistent') THEN
    ALTER TABLE source_conflicts ADD CONSTRAINT source_conflicts_resolved_consistent
      CHECK ((status = 'open' AND resolved_at IS NULL) OR (status <> 'open'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS source_conflicts_license_idx ON source_conflicts (license_id);
CREATE INDEX IF NOT EXISTS source_conflicts_status_idx ON source_conflicts (status, created_at DESC);

COMMENT ON TABLE source_conflicts IS 'PROPOSED (not in spec v2 11-table list). Cross-source disagreements, stored with BOTH values. The license row is never silently overwritten; conflicts stay open until human resolution (US4).';

COMMIT;
