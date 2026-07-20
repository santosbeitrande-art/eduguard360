CREATE TABLE IF NOT EXISTS verification_jobs (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  principal_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL,
  billing_json JSONB NULL,
  result_json JSONB NULL,
  error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_verification_jobs_company_created ON verification_jobs(company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS verification_checks (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES verification_jobs(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  engine TEXT NOT NULL,
  check_id TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL,
  severity TEXT NOT NULL,
  impact TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_verification_checks_job ON verification_checks(job_id);
CREATE INDEX IF NOT EXISTS ix_verification_checks_engine ON verification_checks(engine, status);
CREATE INDEX IF NOT EXISTS ix_verification_checks_company_check ON verification_checks(company_id, check_id, created_at DESC);

CREATE TABLE IF NOT EXISTS verification_feedback_detailed (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES verification_jobs(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  outcome TEXT NOT NULL,
  reviewer_confidence INT NOT NULL,
  decision_status TEXT NOT NULL,
  decision_outcome TEXT NULL,
  decision_approval TEXT NULL,
  authenticity_score NUMERIC(6,2) NULL,
  risk_score NUMERIC(6,2) NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_verification_feedback_company_job ON verification_feedback_detailed(company_id, job_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS issuer_public_sources (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL,
  issuer_type TEXT NOT NULL,
  issuer_name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  auth_mode TEXT NOT NULL DEFAULT 'none',
  cache_ttl_seconds INT NOT NULL DEFAULT 3600,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_issuer_public_sources_country_issuer ON issuer_public_sources(country_code, issuer_type, issuer_name);