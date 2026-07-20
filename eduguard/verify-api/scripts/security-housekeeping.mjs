const base = process.env.BASE_URL || 'http://127.0.0.1:4100';
const adminToken = process.env.ADMIN_TOKEN || process.env.VERIFY_ADMIN_TOKEN || 'change-me-now';
const staleApiKeyDays = Number(process.env.STALE_API_KEY_DAYS || 90);
const revokeStaleApiKeys = String(process.env.REVOKE_STALE_API_KEYS || 'true').toLowerCase() !== 'false';
const dryRun = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';

async function main() {
  const response = await fetch(`${base}/admin/security/housekeeping`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-token': adminToken
    },
    body: JSON.stringify({ staleApiKeyDays, revokeStaleApiKeys, dryRun })
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Housekeeping failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    base,
    dryRun,
    staleApiKeyDays,
    revokeStaleApiKeys,
    result: payload
  }, null, 2));
}

main().catch((error) => {
  console.error(String(error));
  process.exit(1);
});
