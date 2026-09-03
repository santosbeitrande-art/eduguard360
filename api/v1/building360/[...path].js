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

  const resourcePath = normalized.join('/');
  const querySuffix = params ? `?${params}` : '';

  // Prefer the current upstream shape (/building360/*) and keep legacy fallback.
  return {
    primary: `/building360/${resourcePath}${querySuffix}`,
    fallback: `/api/v1/building360/${resourcePath}${querySuffix}`,
  };
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

  const target = buildSafePath(req);
  if (!target) {
    res.status(400).json({ error: 'invalid-building360-path' });
    return;
  }

  proxyBusinessApi(req, target.primary)
    .then((upstream) => {
      if (upstream.ok || upstream.status !== 404 || !target.fallback) return upstream;
      return proxyBusinessApi(req, target.fallback);
    })
    .then((upstream) => {
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
