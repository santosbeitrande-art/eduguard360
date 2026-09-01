import { buildPermissionsByRole, cors, resolveScope } from '../../../_lib/businessApiProxy.js';

export default function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method-not-allowed' });
    return;
  }

  const scope = resolveScope(req);
  const role = scope.role;

  res.status(200).json({
    role,
    portal: 'enterprise',
    permissions: buildPermissionsByRole(role),
    tenantScope: {
      mode: role === 'super_admin' ? 'global' : 'school',
      schoolId: scope.schoolId,
      tenantId: scope.tenantId,
    },
    analyticsScope: {
      level: role === 'super_admin' ? 'global' : 'school',
      canViewAllSchools: role === 'super_admin',
      schoolId: role === 'super_admin' ? null : scope.schoolId,
      modules: ['schools', 'students', 'users', 'entries', 'courses', 'analytics'],
    },
    subject: {
      userId: String(req.body?.userId || req.headers['x-user-id'] || '').trim() || null,
    },
    source: 'fallback',
  });
}
