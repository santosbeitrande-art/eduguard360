const DEFAULT_BUSINESS_API_BASE = 'https://api.eduguard360.co.mz';

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-enterprise-role, x-school-id, x-tenant-id, x-user-id, x-user-name',
  );
}

export function resolveScope(req) {
  const role = String(req.headers['x-enterprise-role'] || req.body?.role || req.query?.role || 'director').trim() || 'director';
  const schoolId = String(
    req.headers['x-school-id'] || req.body?.schoolId || req.body?.school_id || req.query?.schoolId || req.query?.tenantId || 'school-demo',
  ).trim() || 'school-demo';
  const tenantId = String(req.headers['x-tenant-id'] || req.body?.tenantId || req.query?.tenantId || schoolId).trim() || schoolId;
  return { role, schoolId, tenantId };
}

export function buildPermissionsByRole(roleInput) {
  const rawRole = String(roleInput || '').trim().toLowerCase();
  const role = rawRole === 'diretor'
    ? 'director'
    : rawRole === 'seguranca'
      ? 'security'
      : rawRole === 'administrador'
        ? 'administrator'
        : rawRole;

  const full = ['create', 'read', 'update', 'delete', 'approve', 'export'];
  const readOnly = ['read'];
  const base = {
    schools: [],
    users: [],
    courses: [],
    disciplines: [],
    classes: [],
    teachers: [],
    students: [],
    enrollments: [],
    schedule: [],
    grades: [],
    attendance: [],
    incidents: [],
    payments: [],
    employees: [],
    documents: [],
    qr: [],
    analytics: [],
    security: [],
    workflow: [],
  };

  if (role === 'super_admin' || role === 'admin') {
    return Object.fromEntries(Object.keys(base).map((k) => [k, full]));
  }

  if (role === 'director') {
    return {
      ...base,
      schools: ['read', 'update'],
      users: ['create', 'read', 'update', 'approve'],
      courses: ['create', 'read', 'update', 'delete', 'approve'],
      disciplines: ['create', 'read', 'update', 'delete'],
      classes: ['create', 'read', 'update', 'delete'],
      teachers: ['create', 'read', 'update', 'delete'],
      students: ['create', 'read', 'update', 'delete'],
      enrollments: ['create', 'read', 'update', 'approve'],
      schedule: ['create', 'read', 'update', 'approve'],
      grades: ['read', 'approve', 'export'],
      attendance: ['read', 'export'],
      incidents: ['read', 'approve'],
      payments: ['read', 'approve', 'export'],
      employees: ['create', 'read', 'update', 'delete'],
      documents: ['create', 'read', 'update', 'approve', 'export'],
      qr: ['read', 'update'],
      analytics: ['read', 'export'],
      security: ['read', 'update', 'approve'],
      workflow: ['read', 'approve', 'update', 'create'],
    };
  }

  if (role === 'secretaria') {
    return {
      ...base,
      schools: readOnly,
      users: readOnly,
      students: ['create', 'read', 'update'],
      enrollments: ['create', 'read', 'update'],
      classes: readOnly,
      documents: ['create', 'read', 'update', 'export'],
      schedule: readOnly,
      analytics: readOnly,
      security: readOnly,
      workflow: ['read', 'update', 'create'],
    };
  }

  if (role === 'professor' || role === 'teacher') {
    return {
      ...base,
      classes: readOnly,
      students: readOnly,
      schedule: readOnly,
      grades: ['create', 'read', 'update'],
      attendance: ['create', 'read', 'update'],
      incidents: ['create', 'read', 'update'],
      documents: readOnly,
      qr: readOnly,
      analytics: readOnly,
      workflow: readOnly,
      users: readOnly,
      schools: readOnly,
      teachers: readOnly,
      courses: readOnly,
      disciplines: readOnly,
      enrollments: readOnly,
      payments: [],
      employees: [],
      security: readOnly,
    };
  }

  if (role === 'financeiro' || role === 'finance') {
    return {
      ...base,
      schools: readOnly,
      users: readOnly,
      payments: ['create', 'read', 'update', 'approve', 'export'],
      documents: ['read', 'export'],
      analytics: ['read', 'export'],
      enrollments: readOnly,
      students: readOnly,
      courses: readOnly,
      classes: readOnly,
      teachers: readOnly,
      security: readOnly,
      workflow: readOnly,
    };
  }

  if (role === 'security') {
    return {
      ...base,
      schools: readOnly,
      users: readOnly,
      incidents: ['create', 'read', 'update'],
      security: ['read', 'update', 'approve'],
      workflow: ['read', 'update'],
      analytics: readOnly,
      documents: readOnly,
    };
  }

  if (role === 'administrator') {
    return {
      ...base,
      schools: readOnly,
      users: ['create', 'read', 'update'],
      courses: ['create', 'read', 'update', 'delete'],
      disciplines: ['create', 'read', 'update', 'delete'],
      classes: ['create', 'read', 'update', 'delete'],
      teachers: ['create', 'read', 'update', 'delete'],
      students: ['create', 'read', 'update', 'delete'],
      enrollments: ['create', 'read', 'update'],
      schedule: ['create', 'read', 'update'],
      grades: readOnly,
      attendance: readOnly,
      incidents: readOnly,
      payments: readOnly,
      employees: ['read', 'update'],
      documents: ['create', 'read', 'update', 'export'],
      qr: ['read', 'update'],
      analytics: readOnly,
      security: readOnly,
      workflow: ['read', 'update', 'create'],
    };
  }

  return {
    ...base,
    schools: readOnly,
    users: readOnly,
    analytics: readOnly,
    students: readOnly,
    enrollments: readOnly,
    workflow: readOnly,
  };
}

export async function proxyBusinessApi(req, path) {
  const base = String(process.env.BUSINESS_API_BASE || DEFAULT_BUSINESS_API_BASE).replace(/\/$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const timeoutMs = Number(process.env.BUSINESS_API_TIMEOUT_MS || 3500);

  try {
    const headers = {
      'content-type': req.headers['content-type'] || 'application/json',
      authorization: req.headers.authorization || '',
      'x-enterprise-role': req.headers['x-enterprise-role'] || '',
      'x-school-id': req.headers['x-school-id'] || '',
      'x-tenant-id': req.headers['x-tenant-id'] || '',
      'x-user-id': req.headers['x-user-id'] || '',
      'x-user-name': req.headers['x-user-name'] || '',
    };

    const method = String(req.method || 'GET').toUpperCase();
    const bodyAllowed = !['GET', 'HEAD'].includes(method);
    const body = bodyAllowed ? JSON.stringify(req.body || {}) : undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(url, { method, headers, body, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch {
    return {
      ok: false,
      status: 502,
      data: null,
    };
  }
}
