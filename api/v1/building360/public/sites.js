import { cors, proxyBusinessApi } from '../../../_lib/businessApiProxy.js';

const fallbackSites = [
  {
    id: 'site-maputo-central',
    name: 'Maputo Central',
    city: 'Maputo',
    type: 'commercial',
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
    ? `/api/v1/building360/public/sites?${params}`
    : '/api/v1/building360/public/sites';

  proxyBusinessApi(req, path).then((upstream) => {
    if (upstream.ok) {
      res.status(upstream.status).json(upstream.data);
      return;
    }

    res.status(200).json(fallbackSites);
  });
}
