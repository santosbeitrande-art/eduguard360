Verify API (prototype)

Endpoints:
- POST /upload (form field `file`) -> { jobId }
- POST /upload-case (form field `files`, up to 10 files) -> unified case analysis with cross-document consistency
- GET /status/:id -> job JSON
 - GET /status/:id/evidence -> evidence report with multiengine checks, drivers, and real verification counts
 - GET /status/:id/report.pdf -> intelligent PDF report with decision, metrics, suspicious points, and visual evidence map
 - GET /status/:id/evidence/export.csv -> CSV export of all evidence checks by engine for one job
 - GET /status/:id/audit -> auditable case dossier snapshot
 - GET /ops/smoke/exports -> internal-admin smoke proof that PDF/CSV exports include confidence direction fields
 - POST /fraud-signature -> submit anonymized fraud signature (body must include `id`)
 - GET /fraud-signature/:id -> retrieve stored fraud signature
 - POST /training-examples -> authenticated user uploads labeled fraud/authenticity reference docs
 - GET /training-examples -> list training examples (company scoped; internal admin can use `scope=all`)
 - DELETE /training-examples/:id -> remove one training example (owner company or internal admin)
 - GET /training-examples/export.csv -> export filtered training examples to CSV
 - POST /admin/training-examples -> internal admin upload alias (compatibility)
 - GET /admin/training-examples -> internal admin list alias (compatibility)
 - POST /context/:id -> run contextual internet checks for job (requires job with OCR result)
- GET /quality/dashboard -> decision quality dashboard with outcome totals, engine metrics, top failing checks, and feedback alignment proxies

Runtime integrations:

- OCR service via `OCR_SERVICE_URL` using `/ocr/extract`
- Vision service via `VISION_SERVICE_URL` using `/vision/layout`, `/vision/tampering`, `/vision/logo-detection`, `/vision/stamp-detection`, `/vision/signature-detection`, `/vision/qr-barcode`
- Forensics service via `FORENSICS_SERVICE_URL` using `/forensics/pdf`, `/forensics/image`, `/forensics/signatures`
- PostgreSQL job/check persistence via `VERIFY_PG_URL` or `DATABASE_URL`
- Redis cache via `REDIS_URL`
- Public issuer/domain validation via `PUBLIC_SOURCES_JSON`

New architecture assets:

- PostgreSQL schema: `sql/002_verify_ai_postgres_schema.sql`
- Check registry: `src/check_registry.ts`
- Service clients: `src/service_clients.ts`
- Job store abstraction: `src/job_store.ts`
- Microservice compose stack: `../services-compose.yml`
- POST /public/entity-requests -> company onboarding request
- POST /admin/entity-requests/:id/approve -> approve onboarding and create owner
- POST /admin/companies/:companyId/api-keys -> generate enterprise API key
- GET /company/wallet -> tenant wallet and ledger
- POST /company/wallet/topup -> topup credits (owner/manager/billing)
- POST /company/payments/checkout -> start Stripe/Flutterwave/M-Pesa/mock topup
- GET /company/payments -> list payment history
- POST /webhooks/payments/:provider -> confirm payment and credit wallet
- GET /company/audit/export?format=json|csv -> signed audit export (HMAC)
- GET /company/api-keys -> list own API keys
- POST /company/api-keys -> create API key
- POST /company/api-keys/:keyId/rotate -> rotate API key
- DELETE /company/api-keys/:keyId -> revoke API key
- POST /auth/login/jwt -> JWT login (access + refresh)
- POST /auth/token/refresh -> rotate refresh token
- POST /public/password-recovery/request -> issue recovery token with anti-enumeration response
- POST /public/password-recovery/confirm -> validate token and update password
- POST /auth/password/change -> authenticated password change (required after admin temporary reset)
- POST /auth/mfa/setup -> generate TOTP secret and OTPAuth URL
- POST /auth/mfa/setup/confirm -> enable MFA on account
- POST /auth/mfa/verify -> complete MFA challenge on JWT login
- PATCH /admin/users/:id/password -> admin-assisted password reset and forced session revocation
- POST /admin/security/housekeeping -> cleanup expired refresh/MFA and stale API keys
- GET /admin/security/smtp/status -> runtime SMTP configuration health (without exposing secrets)
- POST /admin/security/smtp/verify -> active SMTP connectivity/authentication test
- GET /admin/audit -> immutable-style audit timeline

Authentication:
- User session cookie via /auth/login
- Enterprise token/API key via header x-enterprise-token (or x-api-key)
- JWT bearer access token via Authorization: Bearer <token>
- Admin operations via x-admin-token
- Required env vars for admin bootstrap/access: `VERIFY_ADMIN_TOKEN` and `INTERNAL_ADMIN_PASSWORD`
- SMTP vars for real recovery email delivery: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Fallback (without SMTP) via FormSubmit webhook: `PASSWORD_RECOVERY_FORMSUBMIT_RECIPIENT` (verified recipient, defaults to `admin@eduguard360.co.mz`) and optional `PASSWORD_RECOVERY_FORMSUBMIT_ENDPOINT` (default `https://formsubmit.co/ajax`) and `PASSWORD_RECOVERY_FORMSUBMIT_CC` (`true` by default to copy user)
- Optional password policy vars: `PASSWORD_HISTORY_SECRET` (recommended), plus strong password enforcement (uppercase/lowercase/number, min 8) and password history anti-reuse.
- Recovery hardening vars: `PASSWORD_RESET_RETURN_TOKEN` (debug use only) and `PASSWORD_RESET_ALLOW_MANUAL_FALLBACK` (emergency mode only when SMTP is unavailable).

Access enforcement:
- `/public/login` is public (plans + registration + login)
- `/public` and verification endpoints require authenticated enterprise context
- Only entities with active subscription (`status=active` and `validUntil` in the future) can use `/upload`, `/status/:id`, `/context/:id`, and fraud endpoints
- Verification limits are enforced by selected subscription plan (Starter/Business/Enterprise/Annual)

Billing:
- Every verification consumes credits automatically
- Failed verification triggers automatic refund
- Payment gateway bootstrap supports Stripe, Flutterwave, and M-Pesa patterns

Run:

```bash
cd eduguard/verify-api
npm install
npm run dev

Run the job processor (separate terminal):

```bash
npm run worker

Fraud calibration tests:

```bash
npm run test:fraud
```

Microservices (optional, new architecture):

```bash
cd eduguard
docker compose -f services-compose.yml up --build
```

Recommended env vars for verify-api:

```bash
set OCR_SERVICE_URL=http://127.0.0.1:8012
set VISION_SERVICE_URL=http://127.0.0.1:8011
set FORENSICS_SERVICE_URL=http://127.0.0.1:8013
set VERIFY_PG_URL=postgresql://user:password@localhost:5432/eduguard_verify
set REDIS_URL=redis://127.0.0.1:6379
```

Optional configured public sources:

```bash
set PUBLIC_SOURCES_JSON=[{"id":"mz-gov","countryCode":"MZ","issuerType":"government-domain","issuerName":"Mozambique Government","endpointUrl":"https://www.gov.mz","cacheTtlSeconds":3600,"isActive":true}]
```

Test fixtures are stored in `test-fixtures/fraud_cases.json` and should be updated with anonymized real-world fraud patterns to continuously tune false-positive/false-negative rates.
```

Online development now (public URL):

```bash
cd eduguard/verify-api
npm install
npm run dev:online
```

The command starts the API and opens a public tunnel (localtunnel), printing:
- Local API URL
- Public API URL
- Public portal URL (/public/login)

Bootstrap all online dev next-steps in one command:

```bash
set BASE_URL=http://127.0.0.1:4100
set ADMIN_TOKEN=<seu_token_admin>
npm run bootstrap:online
```

This command validates onboarding, JWT, MFA, payments, API key rotation, signed audit export, and upload flow.

Security housekeeping command:

```bash
set BASE_URL=http://127.0.0.1:4100
set ADMIN_TOKEN=<seu_token_admin>
set DRY_RUN=true
npm run security:housekeeping
```

SQL Server enterprise schema migration:

1) Ensure `sqlcmd` is installed and available on PATH.
2) Export connection env vars:

```bash
set SQLSERVER_HOST=localhost
set SQLSERVER_USER=sa
set SQLSERVER_PASSWORD=YourStrong!Passw0rd
set SQLSERVER_DATABASE=eduguard_verify
```

3) Run migrations:

```bash
npm run db:migrate
```

Migration state is tracked in `sql/.migrations-state.json`.

CI: a GitHub Actions workflow is included at `.github/workflows/ci.yml` to build the backend.
```
