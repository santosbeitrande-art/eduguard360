import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const base = process.env.BASE_URL || 'http://127.0.0.1:4100';
const adminToken = process.env.ADMIN_TOKEN || process.env.VERIFY_ADMIN_TOKEN || 'change-me-now';

function decodeBase32(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = String(base32 || '').toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
  let bits = '';

  for (const char of normalized) {
    const index = alphabet.indexOf(char);
    if (index < 0) continue;
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

function generateTotp(secretBase32, unixTimeMs = Date.now()) {
  const key = decodeBase32(secretBase32);
  const stepSec = 30;
  const counter = Math.floor(unixTimeMs / 1000 / stepSec);
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBytes.writeUInt32BE(counter >>> 0, 4);

  const hmac = crypto.createHmac('sha1', key).update(counterBytes).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);

  return String(code % 1000000).padStart(6, '0');
}

async function asJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function adminApi(method, route, body) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await asJson(response);
  if (!response.ok) throw new Error(`${method} ${route} -> ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

async function userApi(method, route, accessToken, body, asFormData = false) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  if (!asFormData) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${base}${route}`, {
    method,
    headers,
    body: body ? (asFormData ? body : JSON.stringify(body)) : undefined
  });

  const payload = await asJson(response);
  if (!response.ok) throw new Error(`${method} ${route} -> ${response.status} ${JSON.stringify(payload)}`);
  return payload;
}

async function main() {
  const seed = Date.now();
  const ownerEmail = `owner.${seed}@cliente.co.mz`;
  const ownerPassword = 'Dev@12345Strong';

  const request = await userApi('POST', '/public/entity-requests', '', {
    companyName: `Empresa Online ${seed}`,
    institutionType: 'university',
    contactName: 'Owner Demo',
    contactEmail: ownerEmail,
    country: 'MZ'
  }).catch(async () => {
    const response = await fetch(`${base}/public/entity-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: `Empresa Online ${seed}`,
        institutionType: 'university',
        contactName: 'Owner Demo',
        contactEmail: ownerEmail,
        country: 'MZ'
      })
    });
    const payload = await asJson(response);
    if (!response.ok) throw new Error(`POST /public/entity-requests -> ${response.status} ${JSON.stringify(payload)}`);
    return payload;
  });

  const approved = await adminApi('POST', `/admin/entity-requests/${request.request.id}/approve`, {
    ownerEmail,
    ownerPassword
  });

  const login1 = await fetch(`${base}/auth/login/jwt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ownerEmail, password: ownerPassword })
  });
  const login1Payload = await asJson(login1);
  if (!login1.ok) throw new Error(`POST /auth/login/jwt -> ${login1.status} ${JSON.stringify(login1Payload)}`);

  const accessTokenInitial = login1Payload.accessToken;
  const mfaSetup = await userApi('POST', '/auth/mfa/setup', accessTokenInitial, {});
  const codeForSetup = generateTotp(mfaSetup.secretBase32);
  await userApi('POST', '/auth/mfa/setup/confirm', accessTokenInitial, { code: codeForSetup });

  const login2 = await fetch(`${base}/auth/login/jwt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ownerEmail, password: ownerPassword })
  });
  const login2Payload = await asJson(login2);
  if (!login2.ok) throw new Error(`POST /auth/login/jwt (MFA) -> ${login2.status} ${JSON.stringify(login2Payload)}`);
  if (!login2Payload.mfaRequired) throw new Error('Expected MFA challenge, but none was returned.');

  const mfaCode = generateTotp(mfaSetup.secretBase32);
  const mfaVerify = await fetch(`${base}/auth/mfa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: login2Payload.challengeId, code: mfaCode })
  });
  const mfaVerifyPayload = await asJson(mfaVerify);
  if (!mfaVerify.ok) throw new Error(`POST /auth/mfa/verify -> ${mfaVerify.status} ${JSON.stringify(mfaVerifyPayload)}`);

  const accessToken = mfaVerifyPayload.accessToken;

  const payment = await userApi('POST', '/company/payments/checkout', accessToken, {
    provider: 'mock',
    amount: 25,
    currency: 'MZN'
  });

  const createdApiKey = await userApi('POST', '/company/api-keys', accessToken, { name: 'bootstrap-key' });
  const rotatedApiKey = await userApi('POST', `/company/api-keys/${createdApiKey.apiKey.id}/rotate`, accessToken, {});

  const auditJson = await userApi('GET', '/company/audit/export?format=json&limit=200', accessToken);
  const payments = await userApi('GET', '/company/payments', accessToken);

  const form = new FormData();
  const filePath = path.resolve('../verify-frontend/index.html');
  const fileBuffer = fs.readFileSync(filePath);
  form.append('file', new Blob([fileBuffer]), path.basename(filePath));
  const upload = await userApi('POST', '/upload', accessToken, form, true);

  const housekeeping = await adminApi('POST', '/admin/security/housekeeping', {
    staleApiKeyDays: 30,
    revokeStaleApiKeys: true,
    dryRun: true
  });

  console.log(JSON.stringify({
    ok: true,
    base,
    requestId: request.request.id,
    companyId: approved.company.id,
    ownerEmail,
    mfaEnabled: true,
    paymentStatus: payment.payment.status,
    walletBalance: payment.balance,
    apiKeyCreated: createdApiKey.apiKey.keyPrefix,
    apiKeyRotated: rotatedApiKey.apiKey.keyPrefix,
    auditEventsExported: auditJson.count,
    paymentsCount: payments.payments.length,
    upload: {
      jobId: upload.jobId,
      status: upload.status
    },
    housekeepingDryRun: housekeeping
  }, null, 2));
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
