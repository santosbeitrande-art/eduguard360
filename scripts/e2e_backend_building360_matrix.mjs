import handler from '../api/v1/core.js';

const tests = [
  ['platform_admin', '/building360/workspace/platform_admin/property', '/building360/workspace/finance_manager/finance'],
  ['organization_admin', '/building360/workspace/organization_admin/property', '/building360/workspace/finance_manager/finance'],
  ['building_manager', '/building360/workspace/building_manager/property', '/building360/workspace/finance_manager/finance'],
  ['finance_manager', '/building360/workspace/finance_manager/finance', '/building360/workspace/maintenance_manager/maintenance'],
  ['maintenance_manager', '/building360/workspace/maintenance_manager/maintenance', '/building360/workspace/finance_manager/finance'],
  ['security_officer', '/building360/workspace/security_officer/access', '/building360/workspace/organization_admin/property'],
  ['technician', '/building360/workspace/technician/maintenance', '/building360/workspace/building_manager/property'],
  ['resident', '/building360/workspace/resident/people', '/building360/workspace/finance_manager/finance'],
  ['auditor', '/building360/workspace/auditor/insight', '/building360/workspace/technician/maintenance'],
  ['seguranca', '/building360/workspace/security_officer/access', '/building360/workspace/organization_admin/property'],
  ['scanner', '/building360/workspace/security_officer/access', '/building360/workspace/organization_admin/property'],
  ['administrator', '/building360/workspace/organization_admin/property', '/building360/workspace/finance_manager/finance'],
  ['super_admin', '/building360/workspace/platform_admin/property', '/building360/workspace/finance_manager/finance'],
];

const callCore = async (action, role, payload) => {
  const req = {
    method: 'POST',
    query: { action },
    body: payload,
    headers: {
      'x-enterprise-role': role,
      'x-school-id': '11111111-1111-4111-8111-111111111111',
      'x-tenant-id': '11111111-1111-4111-8111-111111111111',
      'content-type': 'application/json',
    },
  };

  let statusCode = 200;
  let output = null;
  const res = {
    setHeader() {},
    status(code) {
      statusCode = code;
      return this;
    },
    json(obj) {
      output = obj;
      return this;
    },
    end() {},
  };

  await handler(req, res);
  return { statusCode, payload: output };
};

const run = async () => {
  const rows = [];

  for (const [role, ownRoute, foreignRoute] of tests) {
    const catalog = await callCore('building360-workspace-catalog', role, { profile: role });
    const own = await callCore('building360-workspace-authorize', role, { route: ownRoute });
    const foreign = await callCore('building360-workspace-authorize', role, { route: foreignRoute });

    rows.push({
      role,
      ownRoute,
      ownAllowed: own?.payload?.allowed ?? null,
      ownReason: own?.payload?.reason ?? null,
      ownStatus: own?.statusCode ?? null,
      foreignRoute,
      foreignAllowed: foreign?.payload?.allowed ?? null,
      foreignReason: foreign?.payload?.reason ?? null,
      foreignStatus: foreign?.statusCode ?? null,
      catalogStatus: catalog?.statusCode ?? null,
      catalogProfile: catalog?.payload?.profile ?? null,
      catalogRoute: catalog?.payload?.route ?? null,
      catalogModules: Array.isArray(catalog?.payload?.modules) ? catalog.payload.modules.map((item) => item.key) : [],
      aliasResolvedRole: own?.payload?.role ?? null,
    });
  }

  console.log(JSON.stringify(rows, null, 2));
};

await run();
