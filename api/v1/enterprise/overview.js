import { cors, proxyBusinessApi, requireEnterpriseScope, resolveScope } from '../../_lib/businessApiProxy.js';

const baseOverview = {
  audit: {
    totalToday: 12,
    logins: 5,
    edits: 4,
    exports: 3,
    latest: [],
  },
  sessions: {
    active: 7,
    total: 23,
    latest: [],
  },
  security: {
    policies: [],
    mfa: {
      total: 12,
      verified: 9,
      trustedDevices: 6,
      latest: [],
    },
  },
  workflows: {
    summary: {
      total: 11,
      byStatus: {
        pending: 3,
        in_review: 4,
        approved: 2,
        completed: 2,
      },
    },
    latest: [],
  },
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

  proxyBusinessApi(req, '/api/v1/enterprise/overview').then((upstream) => {
    if (upstream.ok && upstream.data && typeof upstream.data === 'object') {
      res.status(200).json(upstream.data);
      return;
    }

    const scope = resolveScope(req);
    const guard = requireEnterpriseScope(scope, { domain: 'analytics', action: 'read' });
    if (!guard.ok) {
      res.status(guard.status).json(guard.body);
      return;
    }

    res.status(200).json({
      ...baseOverview,
      scope,
      generatedAt: new Date().toISOString(),
      source: 'fallback',
    });
  });
}
