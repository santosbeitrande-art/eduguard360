import { cors, proxyBusinessApi } from '../../_lib/businessApiProxy.js';

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PATCH', 'DELETE']);

const MOCK_SITE = {
  id: 'site-001',
  name: 'Condominio Central Maputo',
  city: 'Maputo',
  type: 'residential',
};

const MOCK_BUILDING = {
  id: 'building-001',
  siteId: 'site-001',
  name: 'Torre A',
  floors: 12,
};

const MOCK_UNITS = [
  { id: 'unit-001', siteId: 'site-001', buildingId: 'building-001', number: 'A101', type: 'apartment', status: 'occupied', areaM2: 98 },
  { id: 'unit-002', siteId: 'site-001', buildingId: 'building-001', number: 'A203', type: 'apartment', status: 'occupied', areaM2: 112 },
  { id: 'unit-003', siteId: 'site-001', buildingId: 'building-001', number: 'P12', type: 'parking', status: 'vacant', areaM2: 15 },
];

const MOCK_PEOPLE = [
  { id: 'person-001', name: 'Santos Resident', role: 'resident', status: 'active' },
  { id: 'person-002', name: 'Paula Admin', role: 'organization_admin', status: 'active' },
  { id: 'person-003', name: 'Mario Technician', role: 'technician', status: 'active' },
];

const MOCK_ASSIGNMENTS = [
  { id: 'assign-001', personId: 'person-001', role: 'resident', status: 'active' },
  { id: 'assign-002', personId: 'person-002', role: 'organization_admin', status: 'active' },
  { id: 'assign-003', personId: 'person-003', role: 'technician', status: 'active' },
];

const MOCK_ASSETS = [
  { id: 'asset-001', name: 'Bomba de agua', status: 'warning', criticality: 'high' },
  { id: 'asset-002', name: 'Gerador principal', status: 'ok', criticality: 'critical' },
  { id: 'asset-003', name: 'Camera corredor 3', status: 'ok', criticality: 'medium' },
];

const MOCK_WORK_ORDERS = [
  { id: 'wo-001', title: 'Reparar elevador A', status: 'open', priority: 'high' },
  { id: 'wo-002', title: 'Inspecao de incendio piso 6', status: 'in_progress', priority: 'medium' },
  { id: 'wo-003', title: 'Substituir lampadas garagem', status: 'done', priority: 'low' },
];

const MOCK_CONTRACTS = [
  { id: 'contract-001', code: 'CTR-2026-001', title: 'Contrato Unidade A203', status: 'active', amount: 45000, currency: 'MZN' },
  { id: 'contract-002', code: 'CTR-2026-002', title: 'Contrato Loja B12', status: 'active', amount: 76000, currency: 'MZN' },
];

const MOCK_INVOICES = [
  { id: 'invoice-001', invoiceNumber: 'INV-20260903-000101', amount: 45000, status: 'issued', currency: 'MZN' },
  { id: 'invoice-002', invoiceNumber: 'INV-20260903-000102', amount: 76000, status: 'paid', currency: 'MZN' },
];

const filterUnits = (query) => {
  return MOCK_UNITS.filter((item) => {
    if (query.siteId && item.siteId !== query.siteId) return false;
    if (query.buildingId && item.buildingId !== query.buildingId) return false;
    if (query.type && item.type !== query.type) return false;
    if (query.status && item.status !== query.status) return false;
    return true;
  });
};

const filterWorkOrders = (query) => {
  return MOCK_WORK_ORDERS.filter((item) => {
    if (query.status && item.status !== query.status) return false;
    return true;
  });
};

const extractPathAndQuery = (path) => {
  const [rawPath, rawQuery = ''] = String(path || '').split('?');
  return {
    path: rawPath,
    query: Object.fromEntries(new URLSearchParams(rawQuery)),
  };
};

const tryBuildMockResponse = (req, path) => {
  const method = String(req.method || 'GET').toUpperCase();
  const { path: cleanPath, query } = extractPathAndQuery(path);

  if (method === 'GET' && cleanPath === '/building360/overview') {
    return {
      status: 200,
      data: {
        tenantId: String(req.headers?.['x-tenant-id'] || req.headers?.['x-school-id'] || 'tenant-demo-1'),
        portfolio: { sites: 1, buildings: 1, units: 3 },
        operations: { assets: 3, workOrdersOpen: 1, workOrdersDone: 1 },
        maintenance: { criticalAssets: 1, warningAssets: 1 },
        generatedAt: new Date().toISOString(),
        source: 'building360-fallback-mock',
      },
    };
  }

  if (method === 'GET' && cleanPath === '/building360/sites') {
    return { status: 200, data: [MOCK_SITE] };
  }

  if (method === 'GET' && cleanPath === '/building360/buildings') {
    const rows = query.siteId ? [MOCK_BUILDING].filter((item) => item.siteId === query.siteId) : [MOCK_BUILDING];
    return { status: 200, data: rows };
  }

  if (method === 'GET' && cleanPath === '/building360/units') {
    return { status: 200, data: filterUnits(query) };
  }

  if (method === 'GET' && cleanPath === '/building360/assets') {
    return { status: 200, data: MOCK_ASSETS };
  }

  if (method === 'GET' && cleanPath === '/building360/work-orders') {
    return { status: 200, data: filterWorkOrders(query) };
  }

  if (method === 'GET' && cleanPath === '/building360/core/people') {
    return { status: 200, data: MOCK_PEOPLE };
  }

  if (method === 'GET' && cleanPath === '/building360/core/role-assignments') {
    return { status: 200, data: MOCK_ASSIGNMENTS };
  }

  if (method === 'GET' && cleanPath === '/building360/finance/contracts') {
    return { status: 200, data: MOCK_CONTRACTS };
  }

  if (method === 'GET' && cleanPath === '/building360/finance/invoices') {
    return { status: 200, data: MOCK_INVOICES };
  }

  if (method === 'POST' && cleanPath === '/building360/finance/contracts') {
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    return {
      status: 200,
      data: {
        id: `contract-${Date.now()}`,
        code: payload.code || 'CTR-MOCK',
        title: payload.title || 'Contrato mock',
        status: payload.status || 'active',
        amount: Number(payload.amount || 0),
        currency: payload.currency || 'MZN',
        source: 'building360-fallback-mock',
      },
    };
  }

  const idPatchMatch = cleanPath.match(/^\/building360\/(work-orders|core\/people|core\/role-assignments|core\/units)\/([^/]+)$/);
  if (method === 'PATCH' && idPatchMatch) {
    const entity = idPatchMatch[1];
    const id = decodeURIComponent(idPatchMatch[2]);
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    return {
      status: 200,
      data: {
        id,
        entity,
        ...payload,
        updatedAt: new Date().toISOString(),
        source: 'building360-fallback-mock',
      },
    };
  }

  return null;
};

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
      if (!upstream.ok && upstream.status === 404) {
        const mock = tryBuildMockResponse(req, target.primary);
        if (mock) {
          res.status(mock.status).json(mock.data);
          return;
        }
      }

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
