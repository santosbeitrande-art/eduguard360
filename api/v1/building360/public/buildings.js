import { cors, proxyBusinessApi } from '../../../_lib/businessApiProxy.js';

const fallbackBuildings = [
  {
    id: 'bld-torre-a',
    siteId: 'site-maputo-central',
    name: 'Torre A',
    floors: 3,
  },
];

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
    ? `/api/v1/building360/public/buildings?${params}`
    : '/api/v1/building360/public/buildings';

  proxyBusinessApi(req, path).then((upstream) => {
    if (upstream.ok) {
      res.status(upstream.status).json(upstream.data);
      return;
    }

    const siteId = String(req.query?.siteId || '').trim();
    const list = siteId ? fallbackBuildings.filter((item) => item.siteId === siteId) : fallbackBuildings;
    res.status(200).json(list);
  });
}
