import { cors, proxyBusinessApi } from '../../_lib/businessApiProxy.js';

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH', 'DELETE']);

const buildSafePath = (req) => {
  const raw = req.query?.path;
  const segments = Array.isArray(raw) ? raw : [raw].filter(Boolean);
  if (segments.length === 0) return null;

  const normalized = segments
    .map((segment) => String(segment || '').trim())
    .filter(Boolean);

  if (normalized.some((segment) => segment.includes('..') || segment.includes('/'))) {
    return null;
  }

  const safeQuery = { ...(req.query || {}) };
  delete safeQuery.path;
  delete safeQuery.tenantId;

  const params = new URLSearchParams(
    Object.entries(safeQuery)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  ).toString();

  const basePath = `/api/v1/building360/${normalized.join('/')}`;
  return params ? `${basePath}?${params}` : basePath;
};

export default function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const method = String(req.method || 'GET').toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    res.status(405).json({ error: 'method-not-allowed' });
    return;
  }

  const path = buildSafePath(req);
  if (!path) {
    res.status(400).json({ error: 'invalid-building360-path' });
    return;
  }

  proxyBusinessApi(req, path).then((upstream) => {
    res.status(upstream.status || 502).json(
      upstream.ok
        ? upstream.data
        : {
            error: 'business-api-unavailable',
            upstreamStatus: upstream.status || 502,
          }
    );
  });
}
