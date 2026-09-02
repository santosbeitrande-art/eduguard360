import crypto from 'node:crypto';

const DEFAULT_BUSINESS_API_BASE = 'https://api.eduguard360.co.mz';
const UPSTREAM_TIMEOUT_MS = 1500;
const ROLE_ALIASES = {
  diretor: 'director',
  director: 'director',
  'direção': 'director',
  secretaria: 'secretaria',
  secret: 'secretaria',
  financeiro: 'financeiro',
  finance: 'financeiro',
  seguranca: 'seguranca',
  scanner: 'seguranca',
  security: 'seguranca',
  security_officer: 'seguranca',
  platform_admin: 'platform_admin',
  organization_admin: 'organization_admin',
  building_manager: 'building_manager',
  property_manager: 'building_manager',
  finance_manager: 'finance_manager',
  maintenance_manager: 'maintenance_manager',
  technician: 'technician',
  facility_manager: 'facility_manager',
  community_manager: 'community_manager',
  document_manager: 'document_manager',
  parking_manager: 'parking_manager',
  resident: 'resident',
  occupant: 'occupant',
  auditor: 'auditor',
  professor: 'professor',
  teacher: 'professor',
  administrador: 'administrator',
  administrator: 'administrator',
  admin: 'admin',
  super_admin: 'super_admin',
  'super-admin': 'super_admin',
  superadmin: 'super_admin',
};

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-enterprise-role, x-school-id, x-tenant-id, x-user-id, x-user-name',
  );
}

export function normalizeRole(roleInput) {
  const normalized = String(roleInput || '').trim().toLowerCase();
  if (!normalized) return 'unknown';
  return ROLE_ALIASES[normalized] || normalized;
}

function getBearerToken(req) {
  const header = String(req?.headers?.authorization || '').trim();
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function decodeJwtPayload(token) {
  if (!token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function base64UrlEncode(input) {
  const value = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return value.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function verifyHs256Jwt(token, secret) {
  if (!token || !secret) return false;

  const parts = String(token).split('.');
  if (parts.length !== 3) return false;

  const [header64, payload64, signature64] = parts;
  const signingInput = `${header64}.${payload64}`;
  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', secret).update(signingInput).digest(),
  );

  const expected = Buffer.from(expectedSig);
  const actual = Buffer.from(String(signature64));

  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function resolveScope(req) {
  const token = getBearerToken(req);
  const claims = decodeJwtPayload(token);
  const jwtSecret = process.env.JWT_SECRET || '';
  const jwtVerified = Boolean(jwtSecret) && verifyHs256Jwt(token, jwtSecret);

  if (jwtVerified && claims?.sub) {
    const role = normalizeRole(claims.role || claims.perfil);
    const schoolId = String(claims.schoolId || claims.school_id || claims.escola_id || '').trim() || null;
    const tenantId = String(claims.tenantId || claims.tenant_id || schoolId || '').trim() || null;
    const userId = String(claims.sub || claims.userId || '').trim() || null;
    const userName = String(claims.name || claims.nome || '').trim() || null;

    return {
      role,
      schoolId,
      tenantId,
      userId,
      userName,
      isAuthenticated: true,
      authSource: 'jwt',
    };
  }

  const role = normalizeRole(req.headers['x-enterprise-role'] || req.body?.role || req.query?.role);
  const schoolId =
    String(
      req.headers['x-school-id'] ||
        req.body?.schoolId ||
        req.body?.school_id ||
        req.query?.schoolId ||
        req.query?.tenantId ||
        '',
    ).trim() || null;
  const tenantId =
    String(req.headers['x-tenant-id'] || req.body?.tenantId || req.query?.tenantId || schoolId || '').trim() ||
    null;

  return {
    role,
    schoolId,
    tenantId,
    userId: String(req.headers['x-user-id'] || req.body?.userId || '').trim() || null,
    userName: String(req.headers['x-user-name'] || req.body?.userName || '').trim() || null,
    isAuthenticated: false,
    authSource: 'untrusted',
  };
}

export function requireEnterpriseScope(scope, requiredPermission) {
  if (!scope?.isAuthenticated) {
    return {
      ok: false,
      status: 401,
      body: {
        error: 'unauthorized',
        message: 'Valid bearer token is required for enterprise endpoints.',
      },
    };
  }

  const role = normalizeRole(scope?.role);
  if (!role || role === 'unknown') {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'forbidden',
        message: 'Role is required for enterprise endpoints.',
      },
    };
  }

  if (role !== 'super_admin' && !scope?.schoolId && !scope?.tenantId) {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'forbidden',
        message: 'Tenant or school scope is required for this role.',
      },
    };
  }

  if (requiredPermission) {
    const permissions = buildPermissionsByRole(role);
    const allowed = Array.isArray(permissions?.[requiredPermission.domain])
      ? permissions[requiredPermission.domain]
      : [];
    if (!allowed.includes(requiredPermission.action)) {
      return {
        ok: false,
        status: 403,
        body: {
          error: 'forbidden',
          message: `Role '${role}' cannot ${requiredPermission.action} on ${requiredPermission.domain}`,
        },
      };
    }
  }

  return { ok: true, role };
}

export function buildPermissionsByRole(roleInput) {
  const role = normalizeRole(roleInput);

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

  if (role === 'super_admin' || role === 'admin' || role === 'platform_admin') {
    return Object.fromEntries(Object.keys(base).map((k) => [k, full]));
  }

  if (role === 'organization_admin') {
    return {
      ...base,
      schools: ['read', 'update'],
      users: ['create', 'read', 'update', 'approve'],
      students: ['create', 'read', 'update', 'delete'],
      classes: ['create', 'read', 'update', 'delete'],
      enrollments: ['create', 'read', 'update', 'approve'],
      incidents: ['create', 'read', 'update', 'approve'],
      payments: ['read', 'approve', 'export'],
      documents: ['create', 'read', 'update', 'approve', 'export'],
      qr: ['create', 'read', 'update'],
      analytics: ['read', 'export'],
      security: ['read', 'update', 'approve'],
      workflow: ['create', 'read', 'update', 'approve'],
      employees: ['create', 'read', 'update', 'delete'],
    };
  }

  if (role === 'building_manager') {
    return {
      ...base,
      schools: ['read', 'update'],
      users: ['read', 'update'],
      students: ['read', 'update'],
      classes: ['read', 'update'],
      enrollments: ['read', 'update'],
      incidents: ['create', 'read', 'update', 'approve'],
      documents: ['create', 'read', 'update', 'export'],
      qr: ['create', 'read', 'update'],
      analytics: ['read', 'export'],
      security: ['read', 'update'],
      workflow: ['create', 'read', 'update', 'approve'],
      employees: ['read', 'update'],
      payments: ['read'],
    };
  }

  if (role === 'finance_manager') {
    return {
      ...base,
      schools: readOnly,
      users: readOnly,
      students: readOnly,
      enrollments: readOnly,
      payments: ['create', 'read', 'update', 'approve', 'export'],
      documents: ['read', 'export'],
      analytics: ['read', 'export'],
      security: ['read'],
      workflow: ['read', 'approve'],
    };
  }

  if (role === 'maintenance_manager') {
    return {
      ...base,
      schools: readOnly,
      users: readOnly,
      students: readOnly,
      classes: readOnly,
      incidents: ['create', 'read', 'update'],
      documents: ['create', 'read', 'update', 'export'],
      analytics: ['read', 'export'],
      security: ['read'],
      workflow: ['create', 'read', 'update', 'approve'],
      payments: ['read'],
    };
  }

  if (role === 'technician') {
    return {
      ...base,
      schools: readOnly,
      users: readOnly,
      students: readOnly,
      classes: readOnly,
      incidents: ['create', 'read', 'update'],
      documents: ['read', 'update'],
      analytics: ['read'],
      security: ['read'],
      workflow: ['read', 'update'],
      qr: ['read'],
    };
  }

  if (role === 'resident' || role === 'occupant') {
    return {
      ...base,
      schools: readOnly,
      users: readOnly,
      students: readOnly,
      classes: readOnly,
      incidents: ['create', 'read'],
      documents: ['read', 'export'],
      analytics: ['read'],
      payments: ['read'],
      qr: ['read'],
      workflow: ['read'],
    };
  }

  if (role === 'auditor') {
    return {
      ...base,
      schools: readOnly,
      users: readOnly,
      students: readOnly,
      classes: readOnly,
      incidents: ['read', 'export'],
      documents: ['read', 'export'],
      analytics: ['read', 'export'],
      payments: ['read', 'export'],
      qr: ['read', 'export'],
      security: ['read', 'export'],
      workflow: ['read'],
    };
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

  if (role === 'seguranca') {
    return {
      ...base,
      schools: readOnly,
      users: readOnly,
      qr: ['create', 'read', 'update'],
      incidents: ['create', 'read', 'update'],
      security: ['read'],
      workflow: ['read'],
      analytics: [],
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
  const timeoutMs = Number(process.env.BUSINESS_API_TIMEOUT_MS || UPSTREAM_TIMEOUT_MS);

  try {
    const trustedScope = resolveScope(req);

    const headers = {
      'content-type': req.headers['content-type'] || 'application/json',
      authorization: req.headers.authorization || '',
      'x-enterprise-role': trustedScope.isAuthenticated ? trustedScope.role || '' : '',
      'x-school-id': trustedScope.isAuthenticated ? trustedScope.schoolId || '' : '',
      'x-tenant-id': trustedScope.isAuthenticated ? trustedScope.tenantId || '' : '',
      'x-user-id': trustedScope.isAuthenticated ? trustedScope.userId || '' : '',
      'x-user-name': trustedScope.isAuthenticated ? trustedScope.userName || '' : '',
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
  } catch (error) {
    if (error?.name === 'AbortError') {
      return {
        ok: false,
        status: 504,
        data: { error: 'upstream-timeout' },
      };
    }

    return {
      ok: false,
      status: 502,
      data: null,
    };
  }
}
