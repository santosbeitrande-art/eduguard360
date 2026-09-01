-- ============================================================
-- EduGuard Core DB — Memberships Table
-- Migration: 0001_create_memberships
--
-- One record per (user × product × organization).
-- A user can have different roles in different products/orgs.
-- ============================================================

CREATE TABLE IF NOT EXISTS core_memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  user_id         TEXT        NOT NULL,   -- EduGuard user ID (UUID or Supabase UID)

  -- Which product
  product_id      VARCHAR(32) NOT NULL,   -- security | building360 | edumarket | verify-ai | literature | enterprise | analytics

  -- Which organisation within that product
  organization_id TEXT        NOT NULL,   -- escola_id, condo_id, etc.

  -- Role within that product+organisation
  role            VARCHAR(32) NOT NULL,   -- director | professor | administrator | ...

  -- Optional display metadata
  display_name    TEXT,                   -- overrides user.name for this product context
  avatar_url      TEXT,

  -- Lifecycle
  status          VARCHAR(16) NOT NULL DEFAULT 'active',  -- active | suspended | invited | revoked
  invited_by      TEXT,                   -- user_id of the person who granted access
  invited_at      TIMESTAMPTZ,
  accepted_at     TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ,
  revoked_by      TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Enforce one active role per user+product+org
  CONSTRAINT uq_membership UNIQUE (user_id, product_id, organization_id)
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_mem_user       ON core_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_mem_product    ON core_memberships (product_id);
CREATE INDEX IF NOT EXISTS idx_mem_org        ON core_memberships (organization_id);
CREATE INDEX IF NOT EXISTS idx_mem_user_prod  ON core_memberships (user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_mem_status     ON core_memberships (status);

-- Trigger: keep updated_at fresh
CREATE OR REPLACE FUNCTION core_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mem_updated_at ON core_memberships;
CREATE TRIGGER trg_mem_updated_at
  BEFORE UPDATE ON core_memberships
  FOR EACH ROW EXECUTE FUNCTION core_set_updated_at();

-- ── Seed demo data (development only) ──────────────────────────────
-- Simulates the DEMO_MEMBERSHIPS object in api/v1/core.js
INSERT INTO core_memberships (user_id, product_id, organization_id, role, status, accepted_at) VALUES
  ('demo', 'security',    'escola-demo',        'professor',     'active', now()),
  ('demo', 'building360', 'condo-alpha',         'administrator', 'active', now()),
  ('demo', 'edumarket',   'edumarket-global',    'teacher',       'active', now()),
  ('demo', 'literature',  'public',              'student',       'active', now()),
  ('demo', 'enterprise',  'escola-demo',         'professor',     'active', now())
ON CONFLICT (user_id, product_id, organization_id) DO NOTHING;

-- ── View: resolved memberships per user ────────────────────────────
CREATE OR REPLACE VIEW core_user_product_access AS
SELECT
  m.user_id,
  m.product_id,
  m.organization_id,
  m.role,
  m.status,
  m.invited_at,
  m.accepted_at,
  CASE
    WHEN m.status = 'active' THEN true
    ELSE false
  END AS is_active
FROM core_memberships m;
