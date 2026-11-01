import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleBuilding360Route } from './building360ProxyRoute.js';
import { proxyBusinessApi } from './businessApiProxy.js';

const createResponse = () => ({
  statusCode: 0,
  body: null,
  setHeader() {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  end() {
    return this;
  },
});

const sendUpstreamFailure = async (status, body) => {
  const originalFetch = globalThis.fetch;
  const originalApiBase = process.env.BUSINESS_API_BASE;
  process.env.BUSINESS_API_BASE = 'https://building360.test';
  globalThis.fetch = async () => new Response(
    body === null ? '' : JSON.stringify(body),
    { status, headers: { 'content-type': 'application/json' } },
  );

  try {
    const response = createResponse();
    await handleBuilding360Route({ method: 'GET', headers: {}, query: {} }, response, '/overview');
    return response;
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiBase === undefined) delete process.env.BUSINESS_API_BASE;
    else process.env.BUSINESS_API_BASE = originalApiBase;
  }
};

for (const status of [401, 403, 404]) {
  test(`propagates upstream HTTP ${status} instead of returning fixture data`, async () => {
    const body = { error: 'forbidden', message: 'Access denied.' };
    const response = await sendUpstreamFailure(status, body);

    assert.equal(response.statusCode, status);
    assert.deepEqual(response.body, body);
    assert.notEqual(response.body.source, 'building360-fallback-mock');
  });
}

test('preserves API error details for server failures', async () => {
  const body = { error: 'database-unavailable', message: 'Connection failed.' };
  const response = await sendUpstreamFailure(500, body);

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, body);
});

test('returns a useful error when the upstream sends no error body', async () => {
  const response = await sendUpstreamFailure(502, null);

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.body, {
    error: 'business-api-unavailable',
    message: 'The Building360 API did not return an error body.',
    upstreamStatus: 502,
  });
});

test('routes Building360 requests to its dedicated API base when configured', async () => {
  const originalFetch = globalThis.fetch;
  const originalBuildingApi = process.env.BUILDING360_API_BASE;
  const originalBusinessApi = process.env.BUSINESS_API_BASE;
  let requestedUrl = '';
  process.env.BUILDING360_API_BASE = 'https://building360-api.test';
  process.env.BUSINESS_API_BASE = 'https://general-api.test';
  globalThis.fetch = async (input) => {
    requestedUrl = String(input);
    return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    await proxyBusinessApi({ method: 'GET', headers: {}, query: {} }, '/api/v1/building360/public/overview');
    assert.equal(requestedUrl, 'https://building360-api.test/api/v1/building360/public/overview');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBuildingApi === undefined) delete process.env.BUILDING360_API_BASE;
    else process.env.BUILDING360_API_BASE = originalBuildingApi;
    if (originalBusinessApi === undefined) delete process.env.BUSINESS_API_BASE;
    else process.env.BUSINESS_API_BASE = originalBusinessApi;
  }
});
