import fs from 'fs';
import path from 'path';

const base = process.env.BASE_URL || 'http://localhost:4000';
const adminToken = process.env.ADMIN_TOKEN || 'change-me-now';

async function api(method, route, body) {
  const res = await fetch(`${base}${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`${method} ${route} -> ${res.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function login(username, password) {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login failed: ${JSON.stringify(data)}`);

  const cookie = res.headers.get('set-cookie') || '';
  return { cookie, data };
}

async function uploadWithSession(cookie, filePath) {
  const form = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const fileBlob = new Blob([fileBuffer]);
  form.append('file', fileBlob, path.basename(filePath));

  const res = await fetch(`${base}/upload`, {
    method: 'POST',
    headers: { Cookie: cookie },
    body: form
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Upload failed: ${JSON.stringify(data)}`);
  return data;
}

const now = new Date();
const valid = new Date(now);
valid.setFullYear(valid.getFullYear() + 1);

const company = await api('POST', '/admin/companies', {
  name: `Empresa Demo Comercial ${now.toISOString().slice(0, 10)}`,
  billingCycle: 'annual'
});

const companyId = company.company.id;
await api('PATCH', `/admin/companies/${companyId}/subscription`, {
  status: 'active',
  billingCycle: 'annual',
  validUntil: valid.toISOString()
});

const credentials = [
  { username: 'empresa.demo.admin@cliente.co.mz', password: 'Demo@12345AA', role: 'admin' },
  { username: 'empresa.demo.user1@cliente.co.mz', password: 'Demo@12345BB', role: 'user' },
  { username: 'particular.demo@eduguard360.co.mz', password: 'Demo@12345CC', role: 'user' }
];

for (const cred of credentials) {
  await api('POST', `/admin/companies/${companyId}/credentials`, cred);
}

const { cookie, data: loginData } = await login('empresa.demo.user1@cliente.co.mz', 'Demo@12345BB');
const meRes = await fetch(`${base}/auth/me`, { headers: { Cookie: cookie } });
const meData = await meRes.json();

const filePath = path.resolve('../verify-frontend/index.html');
const upload = await uploadWithSession(cookie, filePath);

console.log(JSON.stringify({
  ok: true,
  base,
  companyId,
  credentials,
  login: loginData.user,
  me: meData,
  upload: {
    status: upload.status,
    jobId: upload.jobId,
    score: upload?.result?.summary?.authenticityScore,
    ai: upload?.result?.summary?.aiLikelihood
  }
}, null, 2));
