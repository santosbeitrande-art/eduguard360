import handler from '../api/v1/core.js';

const tests = [
  ['professor', '/sistema/professor', '/sistema/financeiro'],
  ['financeiro', '/sistema/financeiro', '/sistema/professor'],
  ['director', '/sistema/direcao', '/sistema/enterprise'],
  ['seguranca', '/sistema/seguranca', '/sistema/enterprise'],
  ['secretaria', '/sistema/secretaria', '/sistema/financeiro'],
  ['rh', '/sistema/rh', '/sistema/professor'],
  ['coordenador', '/sistema/coordenacao', '/sistema/financeiro'],
  ['super_admin', '/sistema/enterprise', null],
  ['security', '/sistema/seguranca', '/sistema/enterprise'],
  ['security_officer', '/sistema/seguranca', '/sistema/enterprise'],
  ['scanner', '/sistema/seguranca', '/sistema/enterprise'],
];

const callCore = async (action, role, route) => {
  const req = {
    method: 'POST',
    query: { action },
    body: { route, profile: role },
    headers: {
      'x-enterprise-role': role,
      'x-school-id': '11111111-1111-4111-8111-111111111111',
      'content-type': 'application/json',
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
  const rows = [];

  for (const [role, ownRoute, foreignRoute] of tests) {
    const own = await callCore('workspace-authorize', role, ownRoute);
    const foreign = foreignRoute ? await callCore('workspace-authorize', role, foreignRoute) : null;
    const catalog = await callCore('workspace-catalog', role, ownRoute);

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
      catalogPortal: catalog?.payload?.portal ?? null,
      aliasResolvedRole: own?.payload?.role ?? null,
    });
  }

  console.log(JSON.stringify(rows, null, 2));
};

await run();
