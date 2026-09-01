import { cors, resolveScope, buildPermissionsByRole } from '../../../_lib/businessApiProxy.js';

export default function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const scope = resolveScope(req);
  const role = scope.role;

  // Validar permissão para workflows
  const permissions = buildPermissionsByRole(role);
  const canManageWorkflows = Array.isArray(permissions?.workflow) && permissions.workflow.includes('create');

  if (req.method === 'GET') {
    // Retornar workflows simulados para o utilizador
    const workflows = [
      {
        id: 'wf-001',
        title: 'Aprovação de Matrículas',
        type: 'enrollments',
        requester: scope.role === 'director' ? 'Direcção' : scope.role === 'secretaria' ? 'Secretaria' : 'Utilizador',
        owner: role,
        status: 'in_progress',
        priority: 'high',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        steps: [
          { stepName: 'Submissão', ownerRole: 'secretaria', status: 'completed', completedAt: new Date(Date.now() - 86400000).toISOString() },
          { stepName: 'Validação Pedagógica', ownerRole: 'coordenador', status: 'in_progress' },
          { stepName: 'Aprovação Institucional', ownerRole: 'director', status: 'pending' },
          { stepName: 'Concluído', ownerRole: 'administrator', status: 'pending' },
        ],
      },
      {
        id: 'wf-002',
        title: 'Aprovação de Documentos',
        type: 'documents',
        requester: 'Secretaria',
        owner: role,
        status: 'pending',
        priority: 'medium',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date().toISOString(),
        steps: [
          { stepName: 'Submissão', ownerRole: 'secretaria', status: 'completed', completedAt: new Date(Date.now() - 172800000).toISOString() },
          { stepName: 'Validação Pedagógica', ownerRole: 'coordenador', status: 'pending' },
          { stepName: 'Aprovação Institucional', ownerRole: 'director', status: 'pending' },
          { stepName: 'Concluído', ownerRole: 'administrator', status: 'pending' },
        ],
      },
    ];

    // Filtrar workflows visíveis para este role
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
    // Criar novo workflow
    if (!canManageWorkflows) {
      res.status(403).json({
        error: 'forbidden',
        message: `Role '${role}' não tem permissão para criar workflows`,
      });
      return;
    }

    const body2 = req.body || {};
    const newWorkflow = {
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title: String(body2.title || 'Nova Solicitação'),
      type: String(body2.type || 'workflow'),
      requester: String(body2.requester || 'Utilizador'),
      owner: role,
      status: 'pending',
      priority: String(body2.priority || 'medium'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: Array.isArray(body2.steps)
        ? body2.steps.map((step) => ({
            stepName: String(step.stepName || 'Passo'),
            ownerRole: String(step.ownerRole || role),
            status: 'pending',
          }))
        : [
            { stepName: 'Submissão', ownerRole: 'secretaria', status: 'completed', completedAt: new Date().toISOString() },
            { stepName: 'Validação Pedagógica', ownerRole: 'coordenador', status: 'pending' },
            { stepName: 'Aprovação Institucional', ownerRole: 'director', status: 'pending' },
            { stepName: 'Concluído', ownerRole: 'administrator', status: 'pending' },
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
}
