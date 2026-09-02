import { cors, proxyBusinessApi } from '../../../_lib/businessApiProxy.js';

export default function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method-not-allowed' });
    return;
  }

  const safeQuery = { ...(req.query || {}) };
  delete safeQuery.tenantId;
  const params = new URLSearchParams(safeQuery).toString();
  const path = params
    ? `/api/v1/building360/public/buildings?${params}`
    : '/api/v1/building360/public/buildings';

  proxyBusinessApi(req, path).then((upstream) => {
    res.status(upstream.status || 502).json(
      upstream.ok
        ? upstream.data
        : { error: 'business-api-unavailable', upstreamStatus: upstream.status || 502 },
    );
  });
}
