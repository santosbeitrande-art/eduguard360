import { buildPermissionsByRole, cors, proxyBusinessApi, resolveScope } from '../../../_lib/businessApiProxy.js';

function resolveAccess(req) {
  const scope = resolveScope(req);

  return {
    role: scope.role,
    portal: 'enterprise',
    permissions: buildPermissionsByRole(scope.role),
    tenantScope: {
      mode: scope.role === 'super_admin' ? 'global' : 'school',
      schoolId: scope.schoolId,
      tenantId: scope.tenantId,
    },
    analyticsScope: {
      level: scope.role === 'super_admin' ? 'global' : 'school',
      canViewAllSchools: scope.role === 'super_admin',
      schoolId: scope.role === 'super_admin' ? null : scope.schoolId,
      modules: ['schools', 'students', 'users', 'entries', 'courses', 'analytics'],
    },
  };
}

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

  proxyBusinessApi(req, '/api/v1/enterprise/analytics/overview').then((upstream) => {
    if (upstream.ok && upstream.data && typeof upstream.data === 'object') {
      res.status(200).json(upstream.data);
      return;
    }

    const accessProfile = resolveAccess(req);
    const scope = {
      role: accessProfile.role,
      schoolId: accessProfile.tenantScope.schoolId,
      tenantId: accessProfile.tenantScope.tenantId,
    };

    const schoolDistribution = [
      { id: scope.schoolId || 'school-demo', name: scope.schoolId || 'school-demo', users: 23, activeUsers: 17, students: 82, movements: 46, frequency: 56 },
    ];

    const trendByDay = Array.from({ length: 14 }).map((_, idx) => {
      const date = new Date(Date.now() - (13 - idx) * 24 * 60 * 60 * 1000);
      return {
        day: date.toISOString(),
        total: 2 + ((idx * 3) % 7),
        scopeId: scope.schoolId || 'school-demo',
      };
    });

    res.status(200).json({
      accessProfile,
      scope,
      metrics: {
        schoolsTotal: 1,
        studentsTotal: 82,
        usersTotal: 23,
        usersActive: 17,
        listingsTotal: 14,
        listingsAvailable: 9,
        reservationsTotal: 46,
        reservationsActive: 7,
        reservationsCompleted: 34,
        reservationsPending: 3,
        reservationsCancelled: 2,
        paymentsEstimatedMt: 142500,
      },
      breakdowns: {
        schoolDistribution,
        userRoleDistribution: [
          { role: 'director', total: 2 },
          { role: 'professor', total: 11 },
          { role: 'secretaria', total: 4 },
          { role: 'financeiro', total: 2 },
          { role: 'seguranca', total: 4 },
        ],
        reservationStatusDistribution: [
          { status: 'active', total: 7 },
          { status: 'pending', total: 3 },
          { status: 'completed', total: 34 },
          { status: 'cancelled', total: 2 },
        ],
        trendByDay,
      },
      roleLens: {
        pendingApprovals: 7,
        operationalCoverage: 74,
      },
      generatedAt: new Date().toISOString(),
      source: 'fallback',
    });
  });
}
