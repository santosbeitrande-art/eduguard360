import {
  buildPermissionsByRole,
  cors,
  proxyBusinessApi,
  requireEnterpriseScope,
  resolveScope,
} from '../../_lib/businessApiProxy.js';

const BASE_OVERVIEW = {
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

const resolveRoute = (req) => {
  const raw = req.query?.path;
  const parts = Array.isArray(raw) ? raw : [raw].filter(Boolean);
  return parts
    .map((part) => String(part || '').trim().toLowerCase())
    .filter(Boolean)
    .join('/');
};

const resolveAccess = (req) => {
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
};

const handleOverview = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method-not-allowed' });
    return;
  }

  const upstream = await proxyBusinessApi(req, '/api/v1/enterprise/overview');
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
    ...BASE_OVERVIEW,
    scope,
    generatedAt: new Date().toISOString(),
    source: 'fallback',
  });
};

const handleAnalyticsOverview = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method-not-allowed' });
    return;
  }

  const upstream = await proxyBusinessApi(req, '/api/v1/enterprise/analytics/overview');
  if (upstream.ok && upstream.data && typeof upstream.data === 'object') {
    res.status(200).json(upstream.data);
    return;
  }

  const preScope = resolveScope(req);
  const guard = requireEnterpriseScope(preScope, { domain: 'analytics', action: 'read' });
  if (!guard.ok) {
    res.status(guard.status).json(guard.body);
    return;
  }

  const accessProfile = resolveAccess(req);
  const scope = {
    role: accessProfile.role,
    schoolId: accessProfile.tenantScope.schoolId,
    tenantId: accessProfile.tenantScope.tenantId,
  };

  const schoolDistribution = [
    {
      id: scope.schoolId || 'school-demo',
      name: scope.schoolId || 'school-demo',
      users: 23,
      activeUsers: 17,
      students: 82,
      movements: 46,
      frequency: 56,
    },
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
};

const handleAnalyticsRankings = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method-not-allowed' });
    return;
  }

  const upstream = await proxyBusinessApi(req, '/api/v1/enterprise/analytics/rankings');
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
    courses: [
      { id: 'course-1', label: 'Matematica Aplicada', score: 42, subtitle: 'Status: published' },
      { id: 'course-2', label: 'Gestao Operacional', score: 33, subtitle: 'Status: published' },
      { id: 'course-3', label: 'Ingles Tecnico', score: 27, subtitle: 'Status: draft' },
      { id: 'course-4', label: 'Fisica Avancada', score: 24, subtitle: 'Status: published' },
    ],
    professors: [
      { id: 'prof-1', label: 'Prof. Isabel M.', score: 31, subtitle: '4 cursos · 31 conclusoes' },
      { id: 'prof-2', label: 'Prof. Daniel C.', score: 27, subtitle: '3 cursos · 27 conclusoes' },
      { id: 'prof-3', label: 'Prof. Celina A.', score: 22, subtitle: '2 cursos · 22 conclusoes' },
      { id: 'prof-4', label: 'Prof. Mauro T.', score: 19, subtitle: '2 cursos · 19 conclusoes' },
    ],
    generatedAt: new Date().toISOString(),
    source: 'fallback',
  });
};

const handleRbacResolve = (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method-not-allowed' });
    return;
  }

  const scope = resolveScope(req);
  const role = scope.role;
  const guard = requireEnterpriseScope(scope);
  if (!guard.ok) {
    res.status(guard.status).json(guard.body);
    return;
  }

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
};

const handleSecurityPolicies = (req, res) => {
  const body = req.body || {};
  const scope = resolveScope(req);
  const role = scope.role;

  if (req.method === 'PUT') {
    const guard = requireEnterpriseScope(scope, { domain: 'security', action: 'update' });
    if (!guard.ok) {
      res.status(guard.status).json(guard.body);
      return;
    }

    const policyKey = String(req.query?.key || body.key || 'unknown').trim();
    const policy = {
      key: policyKey,
      value: body.value || {},
      updatedBy: String(body.updatedBy || scope.role),
      updatedAt: new Date().toISOString(),
      tenantId: scope.tenantId,
      schoolId: scope.schoolId,
    };

    res.status(200).json({
      message: 'Politica de seguranca atualizada com sucesso',
      data: policy,
      source: 'fallback',
    });
    return;
  }

  if (req.method === 'GET') {
    const guard = requireEnterpriseScope(scope, { domain: 'security', action: 'read' });
    if (!guard.ok) {
      res.status(guard.status).json(guard.body);
      return;
    }

    const policyKey = String(req.query?.key || 'unknown').trim();
    const policy = {
      key: policyKey,
      value: {
        editedAt: new Date().toISOString(),
        module: 'workspace',
        role,
      },
      tenantId: scope.tenantId,
      schoolId: scope.schoolId,
    };

    res.status(200).json({ data: policy, source: 'fallback' });
    return;
  }

  res.status(405).json({ error: 'method-not-allowed' });
};

const handleWorkflows = (req, res) => {
  const scope = resolveScope(req);
  const role = scope.role;

  if (req.method === 'GET') {
    const guard = requireEnterpriseScope(scope, { domain: 'workflow', action: 'read' });
    if (!guard.ok) {
      res.status(guard.status).json(guard.body);
      return;
    }

    const workflows = [
      {
        id: 'wf-001',
        title: 'Aprovacao de Matriculas',
        type: 'enrollments',
        requester: scope.role === 'director' ? 'Direccao' : scope.role === 'secretaria' ? 'Secretaria' : 'Utilizador',
        owner: role,
        status: 'in_progress',
        priority: 'high',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        steps: [
          { stepName: 'Submissao', ownerRole: 'secretaria', status: 'completed', completedAt: new Date(Date.now() - 86400000).toISOString() },
          { stepName: 'Validacao Pedagogica', ownerRole: 'coordenador', status: 'in_progress' },
          { stepName: 'Aprovacao Institucional', ownerRole: 'director', status: 'pending' },
          { stepName: 'Concluido', ownerRole: 'administrator', status: 'pending' },
        ],
      },
      {
        id: 'wf-002',
        title: 'Aprovacao de Documentos',
        type: 'documents',
        requester: 'Secretaria',
        owner: role,
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date().toISOString(),
        steps: [
          { stepName: 'Submissao', ownerRole: 'secretaria', status: 'completed', completedAt: new Date(Date.now() - 172800000).toISOString() },
          { stepName: 'Validacao Pedagogica', ownerRole: 'coordenador', status: 'pending' },
          { stepName: 'Aprovacao Institucional', ownerRole: 'director', status: 'pending' },
          { stepName: 'Concluido', ownerRole: 'administrator', status: 'pending' },
        ],
      },
    ];

    const visibleWorkflows = workflows.filter((wf) => {
      if (role === 'super_admin' || role === 'admin') return true;
      if (role === 'director') return true;
      if (role === 'secretaria') return ['enrollments', 'documents'].includes(wf.type);
      if (role === 'coordenador') return ['enrollments', 'courses'].includes(wf.type);
      return false;
    });

    res.status(200).json({
      data: visibleWorkflows,
      total: visibleWorkflows.length,
      scope: {
        role,
        schoolId: scope.schoolId,
        tenantId: scope.tenantId,
      },
      source: 'fallback',
    });
    return;
  }

  if (req.method === 'POST') {
    const guard = requireEnterpriseScope(scope, { domain: 'workflow', action: 'create' });
    if (!guard.ok) {
      res.status(guard.status).json(guard.body);
      return;
    }

    const payload = req.body || {};
    const newWorkflow = {
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: String(payload.title || 'Nova Solicitacao'),
      type: String(payload.type || 'workflow'),
      requester: String(payload.requester || 'Utilizador'),
      owner: role,
      status: 'pending',
      priority: String(payload.priority || 'medium'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: Array.isArray(payload.steps)
        ? payload.steps.map((step) => ({
            stepName: String(step.stepName || 'Passo'),
            ownerRole: String(step.ownerRole || role),
            status: 'pending',
          }))
        : [
            { stepName: 'Submissao', ownerRole: 'secretaria', status: 'completed', completedAt: new Date().toISOString() },
            { stepName: 'Validacao Pedagogica', ownerRole: 'coordenador', status: 'pending' },
            { stepName: 'Aprovacao Institucional', ownerRole: 'director', status: 'pending' },
            { stepName: 'Concluido', ownerRole: 'administrator', status: 'pending' },
          ],
    };

    res.status(201).json({
      id: newWorkflow.id,
      message: 'Workflow criado com sucesso',
      data: newWorkflow,
      source: 'fallback',
    });
    return;
  }

  res.status(405).json({ error: 'method-not-allowed' });
};

export default async function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const route = resolveRoute(req);

  if (route === 'overview') {
    await handleOverview(req, res);
    return;
  }

  if (route === 'analytics/overview') {
    await handleAnalyticsOverview(req, res);
    return;
  }

  if (route === 'analytics/rankings') {
    await handleAnalyticsRankings(req, res);
    return;
  }

  if (route === 'rbac/resolve') {
    handleRbacResolve(req, res);
    return;
  }

  if (route === 'security/policies' || route === 'security/policies/index') {
    handleSecurityPolicies(req, res);
    return;
  }

  if (route === 'workflows' || route === 'workflows/index') {
    handleWorkflows(req, res);
    return;
  }

  res.status(404).json({
    error: 'enterprise-route-not-found',
    route,
    supportedRoutes: [
      'overview',
      'analytics/overview',
      'analytics/rankings',
      'rbac/resolve',
      'security/policies',
      'workflows',
    ],
  });
}