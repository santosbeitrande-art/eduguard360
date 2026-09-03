import { handleBuilding360Route } from '../../_lib/building360ProxyRoute.js';

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
  const target = buildSafePath(req);
  if (!target) {
    res.status(400).json({ error: 'invalid-building360-path' });
    return;
  }

  const queryPart = String(target.primary).replace(/^\/building360/, '');
  handleBuilding360Route(req, res, queryPart).catch(() => {
    res.status(400).json({ error: 'invalid-building360-path' });
  });
}
