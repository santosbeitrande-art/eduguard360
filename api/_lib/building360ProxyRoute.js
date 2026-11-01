import { cors, proxyBusinessApi } from './businessApiProxy.js';

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH', 'DELETE']);

const toQueryObject = (input) => {
  if (!input || typeof input !== 'object') return {};
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key, value]) => key !== 'path' && value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
};

const appendQuery = (path, queryObject) => {
  const qs = new URLSearchParams(queryObject).toString();
  return qs ? `${path}?${qs}` : path;
};

export async function handleBuilding360Route(req, res, resourcePath) {
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

  const cleanResourcePath = String(resourcePath || '').trim();
  if (!cleanResourcePath.startsWith('/')) {
    res.status(400).json({ error: 'invalid-building360-path' });
    return;
  }

  const queryObject = toQueryObject(req.query || {});
  const primaryPath = appendQuery(`/building360${cleanResourcePath}`, queryObject);
  const fallbackPath = appendQuery(`/api/v1/building360${cleanResourcePath}`, queryObject);

  const first = await proxyBusinessApi(req, primaryPath);
  const upstream = first.ok || first.status !== 404 ? first : await proxyBusinessApi(req, fallbackPath);

  if (upstream.ok) {
    res.status(upstream.status || 200).json(upstream.data);
    return;
  }

  const upstreamStatus = Number(upstream.status) || 502;
  const errorBody = upstream.data && typeof upstream.data === 'object'
    ? upstream.data
    : {
        error: 'business-api-unavailable',
        message: typeof upstream.data === 'string' ? upstream.data : 'The Building360 API did not return an error body.',
        upstreamStatus,
      };

  res.status(upstreamStatus).json(errorBody);
}
