Verify API (prototype)

Endpoints:
- POST /upload (form field `file`) -> { jobId }
- POST /upload-case (form field `files`, up to 10 files) -> unified case analysis with cross-document consistency
- GET /status/:id -> job JSON
 - POST /fraud-signature -> submit anonymized fraud signature (body must include `id`)
 - GET /fraud-signature/:id -> retrieve stored fraud signature
 - POST /training-examples -> authenticated user uploads labeled fraud/authenticity reference docs
 - GET /training-examples -> list training examples (company scoped; internal admin can use `scope=all`)
 - DELETE /training-examples/:id -> remove one training example (owner company or internal admin)
 - GET /training-examples/export.csv -> export filtered training examples to CSV
 - POST /admin/training-examples -> internal admin upload alias (compatibility)
 - GET /admin/training-examples -> internal admin list alias (compatibility)
 - POST /context/:id -> run contextual internet checks for job (requires job with OCR result)
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
- POST /auth/mfa/setup -> generate TOTP secret and OTPAuth URL
- POST /auth/mfa/setup/confirm -> enable MFA on account
- POST /auth/mfa/verify -> complete MFA challenge on JWT login
- POST /admin/security/housekeeping -> cleanup expired refresh/MFA and stale API keys
- GET /admin/audit -> immutable-style audit timeline

Authentication:
- User session cookie via /auth/login
- Enterprise token/API key via header x-enterprise-token (or x-api-key)
- JWT bearer access token via Authorization: Bearer <token>
- Admin operations via x-admin-token

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
set ADMIN_TOKEN=change-me-now
npm run bootstrap:online
```

This command validates onboarding, JWT, MFA, payments, API key rotation, signed audit export, and upload flow.

Security housekeeping command:

```bash
set BASE_URL=http://127.0.0.1:4100
set ADMIN_TOKEN=change-me-now
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
