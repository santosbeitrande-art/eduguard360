import { cors, proxyBusinessApi } from '../../../_lib/businessApiProxy.js';

const fallbackOverview = {
  tenantId: 'tenant-demo-1',
  portfolio: {
    sites: 1,
    buildings: 1,
    units: 9,
  },
  operations: {
    assets: 3,
    workOrdersOpen: 0,
    workOrdersDone: 0,
  },
  maintenance: {
    criticalAssets: 1,
    warningAssets: 1,
  },
  source: 'fallback',
};

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

  proxyBusinessApi(req, '/api/v1/building360/public/overview').then((upstream) => {
    if (upstream.ok) {
      res.status(upstream.status).json(upstream.data);
      return;
    }

    res.status(200).json({
      ...fallbackOverview,
      generatedAt: new Date().toISOString(),
      upstreamStatus: upstream.status,
    });
  });
}
