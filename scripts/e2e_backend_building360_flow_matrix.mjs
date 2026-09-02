import handler from '../api/v1/core.js';

const matrix = [
  {
    stage: 'Request360',
    route: '/building360/workspace/resident/request',
    allowedRole: 'resident',
    deniedRole: 'security_officer',
  },
  {
    stage: 'Maintain360',
    route: '/building360/workspace/maintenance_manager/maintenance',
    allowedRole: 'maintenance_manager',
    deniedRole: 'resident',
  },
  {
    stage: 'Notification (Community360)',
    route: '/building360/workspace/community_manager/community',
    allowedRole: 'community_manager',
    deniedRole: 'technician',
  },
  {
    stage: 'History (Insight360)',
    route: '/building360/workspace/organization_admin/insight',
    allowedRole: 'organization_admin',
    deniedRole: 'resident',
  },
];

const callCore = async (action, role, body) => {
  const req = {
    method: 'POST',
    query: { action },
    body,
    headers: {
      'content-type': 'application/json',
      'x-enterprise-role': role,
      'x-school-id': '11111111-1111-4111-8111-111111111111',
      'x-tenant-id': '11111111-1111-4111-8111-111111111111',
    },
  };

  let statusCode = 200;
  let payload = null;
  const res = {
    setHeader() {},
    status(code) {
      statusCode = code;
      return this;
    },
    json(obj) {
      payload = obj;
      return this;
    },
    end() {},
  };

  await handler(req, res);
  return { statusCode, payload };
};

const run = async () => {
  const results = [];

  for (const test of matrix) {
    const allowed = await callCore('building360-workspace-authorize', test.allowedRole, { route: test.route });
    const denied = await callCore('building360-workspace-authorize', test.deniedRole, { route: test.route });

    results.push({
      stage: test.stage,
      route: test.route,
      allowedRole: test.allowedRole,
      allowedResult: allowed.payload?.allowed ?? null,
      allowedReason: allowed.payload?.reason ?? null,
      deniedRole: test.deniedRole,
      deniedResult: denied.payload?.allowed ?? null,
      deniedReason: denied.payload?.reason ?? null,
      source: 'core-building360-workspace-authorize',
      pass: allowed.payload?.allowed === true && denied.payload?.allowed === false,
    });
  }

  console.log(JSON.stringify(results, null, 2));
};

await run();
