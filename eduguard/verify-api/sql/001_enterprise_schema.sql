SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;

IF OBJECT_ID('dbo.tenants', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.tenants (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    name NVARCHAR(180) NOT NULL,
    tier NVARCHAR(32) NOT NULL,
    plan NVARCHAR(32) NOT NULL,
    status NVARCHAR(32) NOT NULL,
    billing_cycle NVARCHAR(32) NOT NULL,
    valid_until DATETIME2 NOT NULL,
    monthly_quota INT NOT NULL DEFAULT 0,
    consumed_this_period INT NOT NULL DEFAULT 0,
    price_per_verification_credits DECIMAL(18,4) NOT NULL DEFAULT 1,
    credit_balance DECIMAL(18,4) NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    username NVARCHAR(180) NOT NULL,
    password_hash NVARCHAR(300) NOT NULL,
    role NVARCHAR(32) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    mfa_enabled BIT NOT NULL DEFAULT 0,
    mfa_secret NVARCHAR(300) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_users_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id)
  );
  CREATE UNIQUE INDEX UX_users_tenant_username ON dbo.users(tenant_id, username);
END;

IF OBJECT_ID('dbo.api_keys', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.api_keys (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(120) NOT NULL,
    key_prefix NVARCHAR(32) NOT NULL,
    key_hash NVARCHAR(128) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    last_used_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_api_keys_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id)
  );
  CREATE UNIQUE INDEX UX_api_keys_hash ON dbo.api_keys(key_hash);
END;

IF OBJECT_ID('dbo.entity_requests', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.entity_requests (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    company_name NVARCHAR(180) NOT NULL,
    institution_type NVARCHAR(120) NOT NULL,
    contact_name NVARCHAR(120) NOT NULL,
    contact_email NVARCHAR(180) NOT NULL,
    contact_phone NVARCHAR(64) NULL,
    country NVARCHAR(64) NULL,
    notes NVARCHAR(1000) NULL,
    status NVARCHAR(32) NOT NULL,
    reviewed_by NVARCHAR(120) NULL,
    reviewed_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END;

IF OBJECT_ID('dbo.wallet_ledger', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.wallet_ledger (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    entry_type NVARCHAR(40) NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    balance_after DECIMAL(18,4) NOT NULL,
    description NVARCHAR(500) NOT NULL,
    reference_id NVARCHAR(120) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_wallet_ledger_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id)
  );
  CREATE INDEX IX_wallet_ledger_tenant_created ON dbo.wallet_ledger(tenant_id, created_at DESC);
END;

IF OBJECT_ID('dbo.verification_jobs', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.verification_jobs (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    created_by NVARCHAR(180) NOT NULL,
    principal_type NVARCHAR(32) NOT NULL,
    file_path NVARCHAR(400) NOT NULL,
    status NVARCHAR(32) NOT NULL,
    debit_amount DECIMAL(18,4) NULL,
    ledger_id UNIQUEIDENTIFIER NULL,
    result_json NVARCHAR(MAX) NULL,
    error NVARCHAR(1200) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    started_at DATETIME2 NULL,
    finished_at DATETIME2 NULL,
    CONSTRAINT FK_jobs_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id)
  );
  CREATE INDEX IX_jobs_tenant_created ON dbo.verification_jobs(tenant_id, created_at DESC);
END;

IF OBJECT_ID('dbo.refresh_tokens', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.refresh_tokens (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,
    token_hash NVARCHAR(128) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    revoked_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_refresh_tokens_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id),
    CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES dbo.users(id)
  );
  CREATE INDEX IX_refresh_tokens_hash ON dbo.refresh_tokens(token_hash);
END;

IF OBJECT_ID('dbo.payment_transactions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.payment_transactions (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NOT NULL,
    provider NVARCHAR(40) NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    currency NVARCHAR(12) NOT NULL,
    status NVARCHAR(32) NOT NULL,
    external_reference NVARCHAR(120) NULL,
    checkout_url NVARCHAR(500) NULL,
    metadata_json NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_payment_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.tenants(id)
  );
  CREATE INDEX IX_payment_tenant_created ON dbo.payment_transactions(tenant_id, created_at DESC);
END;

IF OBJECT_ID('dbo.audit_events', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.audit_events (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    tenant_id UNIQUEIDENTIFIER NULL,
    actor_type NVARCHAR(40) NOT NULL,
    actor_id NVARCHAR(180) NOT NULL,
    action NVARCHAR(180) NOT NULL,
    metadata_json NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX IX_audit_created ON dbo.audit_events(created_at DESC);
END;
