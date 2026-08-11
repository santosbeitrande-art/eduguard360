import { cors, proxyBusinessApi } from '../../../_lib/businessApiProxy.js';

const fallbackUnits = [
  { id: 'unit-101', siteId: 'site-maputo-central', buildingId: 'bld-torre-a', number: '101', type: 'office', status: 'occupied', areaM2: 85 },
  { id: 'unit-102', siteId: 'site-maputo-central', buildingId: 'bld-torre-a', number: '102', type: 'office', status: 'occupied', areaM2: 85 },
  { id: 'unit-103', siteId: 'site-maputo-central', buildingId: 'bld-torre-a', number: '103', type: 'office', status: 'occupied', areaM2: 85 },
  { id: 'unit-201', siteId: 'site-maputo-central', buildingId: 'bld-torre-a', number: '201', type: 'office', status: 'occupied', areaM2: 85 },
  { id: 'unit-202', siteId: 'site-maputo-central', buildingId: 'bld-torre-a', number: '202', type: 'office', status: 'occupied', areaM2: 85 },
  { id: 'unit-203', siteId: 'site-maputo-central', buildingId: 'bld-torre-a', number: '203', type: 'office', status: 'occupied', areaM2: 85 },
  { id: 'unit-301', siteId: 'site-maputo-central', buildingId: 'bld-torre-a', number: '301', type: 'office', status: 'occupied', areaM2: 85 },
  { id: 'unit-302', siteId: 'site-maputo-central', buildingId: 'bld-torre-a', number: '302', type: 'office', status: 'occupied', areaM2: 85 },
  { id: 'unit-303', siteId: 'site-maputo-central', buildingId: 'bld-torre-a', number: '303', type: 'office', status: 'occupied', areaM2: 85 },
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
    ? `/api/v1/building360/public/units?${params}`
    : '/api/v1/building360/public/units';

  proxyBusinessApi(req, path).then((upstream) => {
    if (upstream.ok) {
      res.status(upstream.status).json(upstream.data);
      return;
    }

    const siteId = String(req.query?.siteId || '').trim();
    const buildingId = String(req.query?.buildingId || '').trim();
    const type = String(req.query?.type || '').trim();
    const status = String(req.query?.status || '').trim();

    const list = fallbackUnits.filter((item) => {
      if (siteId && item.siteId !== siteId) return false;
      if (buildingId && item.buildingId !== buildingId) return false;
      if (type && item.type !== type) return false;
      if (status && item.status !== status) return false;
      return true;
    });

    res.status(200).json(list);
  });
}
