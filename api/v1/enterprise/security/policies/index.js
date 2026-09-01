import { cors, resolveScope, buildPermissionsByRole } from '../../../../_lib/businessApiProxy.js';

export default function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const body = req.body || {};
  const scope = resolveScope(req);
  const role = scope.role;

  // Validar permissão para segurança
  const permissions = buildPermissionsByRole(role);
  const canManageSecurity = Array.isArray(permissions?.security) && (permissions.security.includes('update') || permissions.security.includes('approve'));

  if (req.method === 'PUT') {
    if (!canManageSecurity && role !== 'director' && role !== 'super_admin' && role !== 'admin') {
      res.status(403).json({
        error: 'forbidden',
        message: `Role '${role}' não tem permissão para atualizar políticas de segurança`,
      });
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
      message: 'Política de segurança atualizada com sucesso',
      data: policy,
      source: 'fallback',
    });
    return;
  }

  if (req.method === 'GET') {
    const policyKey = String(req.query?.key || 'unknown').trim();

    const policy = {
      key: policyKey,
      value: {
        editedAt: new Date().toISOString(),
        module: 'workspace',
        role: role,
      },
      tenantId: scope.tenantId,
      schoolId: scope.schoolId,
    };

    res.status(200).json({
      data: policy,
      source: 'fallback',
    });
    return;
  }

  res.status(405).json({ error: 'method-not-allowed' });
}
