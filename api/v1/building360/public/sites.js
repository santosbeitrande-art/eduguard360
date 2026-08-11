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

  const params = new URLSearchParams(req.query || {}).toString();
  const path = params
    ? `/api/v1/building360/public/sites?${params}`
    : '/api/v1/building360/public/sites';

  proxyBusinessApi(req, path).then((upstream) => {
    if (upstream.ok) {
      res.status(upstream.status).json(upstream.data);
      return;
    }

    res.status(502).json({
      error: 'building360-upstream-unavailable',
      status: upstream.status,
      data: [],
    });
  });
}
