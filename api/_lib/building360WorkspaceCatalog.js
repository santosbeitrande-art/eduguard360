import { normalizeRole, buildPermissionsByRole } from './businessApiProxy.js';

const moduleCatalog = [
  { key: 'property', title: 'Property Management', subtitle: 'Sites, edificios, pisos e unidades', domain: 'schools' },
  { key: 'buildingpass', title: 'BuildingPass', subtitle: 'Identidade, credenciais, QR, visitantes e acessos', domain: 'qr' },
  { key: 'community', title: 'Community360', subtitle: 'Avisos, comunicados, assembleias e notificacoes segmentadas', domain: 'users' },
  { key: 'chat', title: 'Chat360', subtitle: 'Chat operacional integrado com atendimento e ocorrencias', domain: 'workflow' },
  { key: 'request', title: 'Request360', subtitle: 'Solicitacoes com workflow completo e SLA', domain: 'workflow' },
  { key: 'complaint', title: 'Complaint360', subtitle: 'Reclamacoes auditaveis com evidencias e historico', domain: 'incidents' },
  { key: 'finance', title: 'Finance360', subtitle: 'Contratos, cobrancas, faturas e pagamentos', domain: 'payments' },
  { key: 'asset', title: 'Asset360', subtitle: 'Activos e inventario tecnico por edificio/unidade', domain: 'workflow' },
  { key: 'maintenance', title: 'Maintain360', subtitle: 'Manutencao preventiva e corretiva com ordens de trabalho', domain: 'workflow' },
  { key: 'access', title: 'Access Control', subtitle: 'Politicas de acesso e credenciais por zona', domain: 'security' },
  { key: 'people', title: 'People & Community', subtitle: 'Residentes, ocupantes e comunidade', domain: 'users' },
  { key: 'reserve', title: 'Reserve360', subtitle: 'Reservas de espacos, regras e disponibilidade', domain: 'schedule' },
  { key: 'move', title: 'Move360', subtitle: 'Mudancas, autorizacoes e coordenacao com seguranca', domain: 'workflow' },
  { key: 'documents', title: 'Document360', subtitle: 'Documentacao, validade e auditoria', domain: 'documents' },
  { key: 'parking', title: 'Parking360', subtitle: 'Vagas, reservas e mobilidade', domain: 'security' },
  { key: 'security', title: 'Security360', subtitle: 'Incidentes, rondas, emergencia e auditoria', domain: 'incidents' },
  { key: 'insight', title: 'Insight360', subtitle: 'Indicadores operacionais e BI', domain: 'analytics' },
  { key: 'intelligence', title: 'Building Intelligence', subtitle: 'IA para risco e previsao operacional', domain: 'analytics' },
];

const roleProfiles = {
  platform_admin: {
    label: 'Platform Admin',
    portal: 'building360',
    allowedModules: moduleCatalog.map((m) => m.key),
  },
  organization_admin: {
    label: 'Organization Admin',
    portal: 'building360',
    allowedModules: moduleCatalog.map((m) => m.key),
  },
  building_manager: {
    label: 'Property Manager',
    portal: 'building360',
    allowedModules: ['property', 'buildingpass', 'community', 'chat', 'request', 'complaint', 'asset', 'maintenance', 'people', 'reserve', 'move', 'documents', 'parking', 'security', 'insight'],
  },
  finance_manager: {
    label: 'Finance Manager',
    portal: 'building360',
    allowedModules: ['finance', 'documents', 'insight', 'complaint'],
  },
  maintenance_manager: {
    label: 'Maintenance Manager',
    portal: 'building360',
    allowedModules: ['request', 'asset', 'maintenance', 'property', 'documents', 'insight', 'move'],
  },
  security_manager: {
    label: 'Security Manager',
    portal: 'building360',
    allowedModules: ['buildingpass', 'access', 'security', 'insight', 'documents', 'move', 'parking'],
  },
  security_officer: {
    label: 'Security Officer',
    portal: 'building360',
    allowedModules: ['buildingpass', 'access', 'security', 'move'],
  },
  community_manager: {
    label: 'Community Manager',
    portal: 'building360',
    allowedModules: ['community', 'chat', 'request', 'complaint', 'people', 'documents', 'insight'],
  },
  document_manager: {
    label: 'Document Manager',
    portal: 'building360',
    allowedModules: ['documents', 'complaint', 'insight'],
  },
  parking_manager: {
    label: 'Parking Manager',
    portal: 'building360',
    allowedModules: ['parking', 'reserve', 'access', 'buildingpass', 'insight'],
  },
  technician: {
    label: 'Technician',
    portal: 'building360',
    allowedModules: ['request', 'maintenance', 'asset'],
  },
  resident: {
    label: 'Resident',
    portal: 'building360',
    allowedModules: ['people', 'buildingpass', 'request', 'complaint', 'finance', 'reserve', 'move', 'documents', 'community', 'chat'],
  },
  occupant: {
    label: 'Occupant',
    portal: 'building360',
    allowedModules: ['people', 'buildingpass', 'request', 'complaint', 'reserve', 'community', 'chat'],
  },
  auditor: {
    label: 'Auditor',
    portal: 'building360',
    allowedModules: ['insight', 'finance', 'security', 'documents', 'complaint', 'request', 'maintenance', 'asset'],
  },
};

const roleAliases = {
  administrator: 'organization_admin',
  admin: 'platform_admin',
  super_admin: 'platform_admin',
  diretor: 'organization_admin',
  director: 'organization_admin',
  financeiro: 'finance_manager',
  maintenance: 'maintenance_manager',
  community_manager: 'community_manager',
  document_manager: 'document_manager',
  parking_manager: 'parking_manager',
  seguranca: 'security_officer',
  scanner: 'security_officer',
  security: 'security_officer',
  security_officer: 'security_officer',
  porteiro: 'security_officer',
  rh: 'building_manager',
};

export const normalizeBuilding360Profile = (input) => {
  const normalized = normalizeRole(input);
  return roleAliases[normalized] || normalized;
};

export const getBuilding360SupportedProfiles = () => Object.keys(roleProfiles);

export const getBuilding360WorkspaceCatalog = (inputRole) => {
  const profile = normalizeBuilding360Profile(inputRole);
  const roleDef = roleProfiles[profile];
  if (!roleDef) return null;

  const permissions = buildPermissionsByRole(profile);
  const modules = moduleCatalog
    .filter((moduleDef) => roleDef.allowedModules.includes(moduleDef.key))
    .map((moduleDef) => {
      const domainActions = Array.isArray(permissions[moduleDef.domain]) ? permissions[moduleDef.domain] : [];
      return {
        ...moduleDef,
        actions: domainActions,
        route: `/building360/workspace/${profile}/${moduleDef.key}`,
      };
    });

  const allowedRoutePrefixes = modules.flatMap((moduleDef) => [
    `/building360/workspace/${profile}/${moduleDef.key}`,
    `/sistema/building360/${profile}/${moduleDef.key}`,
  ]);

  return {
    profile,
    label: roleDef.label,
    portal: roleDef.portal,
    route: `/building360/workspace/${profile}/${modules[0]?.key || 'property'}`,
    allowedRoutePrefixes,
    modules,
    permissions,
  };
};
