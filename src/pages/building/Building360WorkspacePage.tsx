import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export';
type PermissionDomain =
  | 'schools'
  | 'users'
  | 'courses'
  | 'disciplines'
  | 'classes'
  | 'teachers'
  | 'students'
  | 'enrollments'
  | 'schedule'
  | 'grades'
  | 'attendance'
  | 'incidents'
  | 'payments'
  | 'employees'
  | 'documents'
  | 'qr'
  | 'analytics'
  | 'security'
  | 'workflow';

type ModuleDef = {
  key: string;
  title: string;
  subtitle: string;
  domain: PermissionDomain;
  actions: PermissionAction[];
  route: string;
};

type CatalogResponse = {
  profile: string;
  label: string;
  route: string;
  portal: string;
  modules: ModuleDef[];
  permissions: Record<PermissionDomain, PermissionAction[]>;
  allowedRoutePrefixes: string[];
  source: string;
};

type AuthorizeResponse = {
  role: string;
  requestedRoute: string;
  allowed: boolean;
  reason: string;
  canonicalRoute: string;
};

type ModuleApiSpec = {
  listPath: string;
  editPath?: string;
  editMethod: 'PATCH' | 'POST';
};

type FlowRecord = {
  id: string;
  unit: string;
  category: string;
  status: 'request_opened' | 'maintenance_assigned' | 'notification_sent' | 'history_closed';
  requestAt: string;
  maintenanceAt?: string;
  notificationAt?: string;
  historyClosedAt?: string;
  actors: {
    requestBy?: string;
    maintenanceBy?: string;
    notificationBy?: string;
    historyBy?: string;
  };
};

const FLOW_STORAGE_KEY = 'building360.flow.records.v1';

const ROLE_ALIASES: Record<string, string> = {
  super_admin: 'platform_admin',
  admin: 'platform_admin',
  administrator: 'organization_admin',
  director: 'organization_admin',
  diretor: 'organization_admin',
  finance: 'finance_manager',
  financeiro: 'finance_manager',
  maintenance: 'maintenance_manager',
  community_manager: 'community_manager',
  document_manager: 'document_manager',
  parking_manager: 'parking_manager',
  seguranca: 'security_officer',
  security: 'security_officer',
  scanner: 'security_officer',
};

const MODULE_API: Record<string, ModuleApiSpec> = {
  property: {
    listPath: '/api/v1/building360/units',
    editPath: '/api/v1/building360/core/units/:id',
    editMethod: 'PATCH',
  },
  buildingpass: {
    listPath: '/api/v1/building360/core/role-assignments',
    editPath: '/api/v1/building360/core/role-assignments/:id',
    editMethod: 'PATCH',
  },
  community: {
    listPath: '/api/v1/building360/core/people',
    editPath: '/api/v1/building360/core/people/:id',
    editMethod: 'PATCH',
  },
  chat: {
    listPath: '/api/v1/building360/core/people',
    editMethod: 'PATCH',
  },
  request: {
    listPath: '/api/v1/building360/work-orders',
    editPath: '/api/v1/building360/work-orders/:id',
    editMethod: 'PATCH',
  },
  complaint: {
    listPath: '/api/v1/building360/work-orders?status=open',
    editPath: '/api/v1/building360/work-orders/:id',
    editMethod: 'PATCH',
  },
  finance: {
    listPath: '/api/v1/building360/finance/contracts',
    editPath: '/api/v1/building360/finance/contracts',
    editMethod: 'POST',
  },
  asset: {
    listPath: '/api/v1/building360/assets',
    editMethod: 'PATCH',
  },
  maintenance: {
    listPath: '/api/v1/building360/work-orders',
    editPath: '/api/v1/building360/work-orders/:id',
    editMethod: 'PATCH',
  },
  access: {
    listPath: '/api/v1/building360/core/role-assignments',
    editPath: '/api/v1/building360/core/role-assignments/:id',
    editMethod: 'PATCH',
  },
  people: {
    listPath: '/api/v1/building360/core/people',
    editPath: '/api/v1/building360/core/people/:id',
    editMethod: 'PATCH',
  },
  reserve: {
    listPath: '/api/v1/building360/units?status=vacant',
    editMethod: 'PATCH',
  },
  move: {
    listPath: '/api/v1/building360/core/role-assignments',
    editPath: '/api/v1/building360/core/role-assignments/:id',
    editMethod: 'PATCH',
  },
  documents: {
    listPath: '/api/v1/building360/finance/invoices',
    editMethod: 'PATCH',
  },
  parking: {
    listPath: '/api/v1/building360/units?type=parking',
    editPath: '/api/v1/building360/core/units/:id',
    editMethod: 'PATCH',
  },
  security: {
    listPath: '/api/v1/building360/work-orders?status=open',
    editPath: '/api/v1/building360/work-orders/:id',
    editMethod: 'PATCH',
  },
  insight: {
    listPath: '/api/v1/building360/overview',
    editMethod: 'PATCH',
  },
  intelligence: {
    listPath: '/api/v1/building360/overview',
    editMethod: 'PATCH',
  },
};

const FALLBACK_ALLOWED_MODULES: Record<string, string[]> = {
  platform_admin: ['property', 'buildingpass', 'community', 'chat', 'request', 'complaint', 'finance', 'asset', 'maintenance', 'access', 'people', 'reserve', 'move', 'documents', 'parking', 'security', 'insight', 'intelligence'],
  organization_admin: ['property', 'buildingpass', 'community', 'chat', 'request', 'complaint', 'finance', 'asset', 'maintenance', 'access', 'people', 'reserve', 'move', 'documents', 'parking', 'security', 'insight', 'intelligence'],
  building_manager: ['property', 'buildingpass', 'community', 'chat', 'request', 'complaint', 'asset', 'maintenance', 'people', 'reserve', 'move', 'documents', 'parking', 'security', 'insight'],
  finance_manager: ['finance', 'documents', 'insight', 'complaint'],
  maintenance_manager: ['request', 'asset', 'maintenance', 'property', 'documents', 'insight', 'move'],
  security_manager: ['buildingpass', 'access', 'security', 'insight', 'documents', 'move', 'parking'],
  security_officer: ['buildingpass', 'access', 'security', 'move'],
  community_manager: ['community', 'chat', 'request', 'complaint', 'people', 'documents', 'insight'],
  document_manager: ['documents', 'complaint', 'insight'],
  parking_manager: ['parking', 'reserve', 'access', 'buildingpass', 'insight'],
  technician: ['request', 'maintenance', 'asset'],
  resident: ['people', 'buildingpass', 'request', 'complaint', 'finance', 'reserve', 'move', 'documents', 'community', 'chat'],
  occupant: ['people', 'buildingpass', 'request', 'complaint', 'reserve', 'community', 'chat'],
  auditor: ['finance', 'documents', 'security', 'insight', 'complaint', 'request', 'maintenance', 'asset'],
};

const MODULE_TITLES: Record<string, string> = {
  property: 'Property Management',
  buildingpass: 'BuildingPass',
  community: 'Community360',
  chat: 'Chat360',
  request: 'Request360',
  complaint: 'Complaint360',
  finance: 'Finance360',
  asset: 'Asset360',
  maintenance: 'Maintain360',
  access: 'Access Control',
  people: 'People & Community',
  reserve: 'Reserve360',
  move: 'Move360',
  documents: 'Document360',
  parking: 'Parking360',
  security: 'Security360',
  insight: 'Insight360',
  intelligence: 'Building Intelligence',
};

const MODULE_SUBTITLES: Record<string, string> = {
  property: 'Sites, edificios, pisos e unidades',
  buildingpass: 'Identidade, credenciais, QR e visitantes',
  community: 'Avisos, comunicados e notificacoes segmentadas',
  chat: 'Conversas operacionais com conversao em ticket',
  request: 'Solicitacoes com workflow e SLA',
  complaint: 'Reclamacoes com evidencia e historico auditavel',
  finance: 'Contratos, cobrancas, faturas e pagamentos',
  asset: 'Activos e inventario tecnico',
  maintenance: 'Manutencao preventiva e corretiva',
  access: 'Politicas de acesso por zona e horario',
  people: 'Residentes, ocupantes e comunidade',
  reserve: 'Reservas de espacos e disponibilidade',
  move: 'Mudancas e autorizacoes com seguranca',
  documents: 'Documentacao, validade e auditoria',
  parking: 'Vagas, reservas e mobilidade',
  security: 'Incidentes, rondas, emergencia e auditoria',
  insight: 'Indicadores operacionais e BI',
  intelligence: 'IA para risco e previsao operacional',
};

const MODULE_DOMAINS: Record<string, PermissionDomain> = {
  property: 'schools',
  buildingpass: 'qr',
  community: 'users',
  chat: 'workflow',
  request: 'workflow',
  complaint: 'incidents',
  finance: 'payments',
  asset: 'workflow',
  maintenance: 'workflow',
  access: 'security',
  people: 'users',
  reserve: 'schedule',
  move: 'workflow',
  documents: 'documents',
  parking: 'security',
  security: 'incidents',
  insight: 'analytics',
  intelligence: 'analytics',
};

const buildFallbackCatalog = (profile: string): CatalogResponse | null => {
  const allowed = FALLBACK_ALLOWED_MODULES[profile];
  if (!allowed?.length) return null;

  const modules: ModuleDef[] = allowed.map((key) => ({
    key,
    title: MODULE_TITLES[key] || key,
    subtitle: MODULE_SUBTITLES[key] || 'Modulo Building360',
    domain: MODULE_DOMAINS[key] || 'analytics',
    actions: ['read'],
    route: `/building360/workspace/${profile}/${key}`,
  }));

  const emptyPermissions = {
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
  } as Record<PermissionDomain, PermissionAction[]>;

  return {
    profile,
    label: profile,
    route: modules[0]?.route || `/building360/workspace/${profile}/property`,
    portal: 'building360',
    modules,
    permissions: emptyPermissions,
    allowedRoutePrefixes: modules.flatMap((module) => [
      `/building360/workspace/${profile}/${module.key}`,
      `/sistema/building360/${profile}/${module.key}`,
    ]),
    source: 'frontend-fallback-catalog',
  };
};

const resolveCurrentUserSnapshot = () => {
  for (const key of ['currentUser', 'eduguard_user', 'user']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      continue;
    }
  }
  return null;
};

const resolveRole = (raw: unknown): string => {
  const normalized = String(raw || '').trim().toLowerCase();
  return ROLE_ALIASES[normalized] || normalized;
};

const extractRows = (data: unknown): any[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const shape = data as Record<string, unknown>;
    if (Array.isArray(shape.data)) return shape.data as any[];
    return [shape];
  }
  return [];
};

const buildHeaders = (currentUser: any): HeadersInit => {
  const token = String(localStorage.getItem('eduguard_token') || localStorage.getItem('token') || '').trim();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-enterprise-role': String(currentUser?.perfil || currentUser?.role || ''),
    'x-user-id': String(currentUser?.id || currentUser?.user_id || ''),
    'x-school-id': String(currentUser?.escola_id || currentUser?.school_id || currentUser?.tenant_id || ''),
    'x-tenant-id': String(currentUser?.tenant_id || currentUser?.escola_id || currentUser?.school_id || ''),
  };
};

const pickRowId = (row: any): string => {
  const id = row?.id || row?.uuid || row?.unitId || row?.siteId || row?.buildingId || row?.personId || row?.assignmentId;
  return String(id || '').trim();
};

const loadFlowRecords = (): FlowRecord[] => {
  try {
    const raw = localStorage.getItem(FLOW_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persistFlowRecords = (records: FlowRecord[]) => {
  localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(records));
};

const Building360WorkspacePage = () => {
  const navigate = useNavigate();
  const params = useParams();

  const requestedProfile = resolveRole(params.profile || '');
  const requestedModule = String(params.module || '').trim().toLowerCase();

  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [authorize, setAuthorize] = useState<AuthorizeResponse | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [editorValue, setEditorValue] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [flowRecords, setFlowRecords] = useState<FlowRecord[]>([]);

  const selectedModule = useMemo(
    () => catalog?.modules?.find((module) => module.key === requestedModule) || null,
    [catalog?.modules, requestedModule]
  );

  const effectiveProfile = catalog?.profile || requestedProfile;
  const isResidentShell = effectiveProfile === 'resident' || effectiveProfile === 'occupant';
  const isAdminShell = !isResidentShell;

  const moduleApi = selectedModule ? MODULE_API[selectedModule.key] : undefined;

  const requestJson = async (input: string, init?: RequestInit) => {
    const response = await fetch(input, init);
    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { response, data };
  };

  const loadModuleRows = async (currentUser: any, moduleKey: string) => {
    const api = MODULE_API[moduleKey];
    if (!api) {
      setRows([]);
      setSelectedRow(null);
      setEditorValue('');
      return;
    }

    const { response, data } = await requestJson(api.listPath, {
      method: 'GET',
      headers: buildHeaders(currentUser),
    });

    if (!response.ok) {
      const message = data?.message || data?.error || `HTTP ${response.status}`;
      throw new Error(String(message));
    }

    const resultRows = extractRows(data);
    setRows(resultRows);

    const first = resultRows[0] || null;
    setSelectedRow(first);
    setEditorValue(first ? JSON.stringify(first, null, 2) : '{}');
  };

  const loadWorkspace = async () => {
    setLoading(true);
    setErrorMessage('');
    setStatusMessage('');

    const currentUser = resolveCurrentUserSnapshot();
    if (!currentUser) {
      navigate('/sistema');
      return;
    }

    const profileToLoad = requestedProfile || resolveRole(currentUser?.perfil || currentUser?.role);
    const targetRoute = `/building360/workspace/${profileToLoad}/${requestedModule || 'property'}`;

    try {
      const catalogCall = await requestJson('/api/v1/core?action=building360-workspace-catalog', {
        method: 'POST',
        headers: buildHeaders(currentUser),
        body: JSON.stringify({ profile: profileToLoad }),
      });

      if (!catalogCall.response.ok) {
        const fallbackCatalog = buildFallbackCatalog(profileToLoad);
        if (catalogCall.response.status === 404 && fallbackCatalog) {
          const requesterRole = resolveRole(currentUser?.perfil || currentUser?.role);
          const requesterIsPlatformAdmin = requesterRole === 'platform_admin';
          const canInspectProfile = requesterRole === profileToLoad || requesterIsPlatformAdmin;
          const localAllowed = canInspectProfile && fallbackCatalog.allowedRoutePrefixes.some((prefix) => targetRoute.startsWith(prefix));

          setCatalog(fallbackCatalog);
          setAuthorize({
            role: requesterRole,
            requestedRoute: targetRoute,
            allowed: localAllowed,
            reason: localAllowed ? 'frontend-fallback-route-allowed' : 'frontend-fallback-route-denied',
            canonicalRoute: fallbackCatalog.route,
          });

          if (!localAllowed) {
            setRows([]);
            setSelectedRow(null);
            setEditorValue('');
            setLoading(false);
            return;
          }

          await loadModuleRows(currentUser, requestedModule);
          setLoading(false);
          return;
        }

        setAuthorize({
          role: profileToLoad,
          requestedRoute: targetRoute,
          allowed: false,
          reason: String(catalogCall.data?.message || 'catalog-access-denied'),
          canonicalRoute: '',
        });
        setRows([]);
        setSelectedRow(null);
        setEditorValue('');
        setLoading(false);
        return;
      }

      setCatalog(catalogCall.data as CatalogResponse);

      const authCall = await requestJson('/api/v1/core?action=building360-workspace-authorize', {
        method: 'POST',
        headers: buildHeaders(currentUser),
        body: JSON.stringify({ route: targetRoute }),
      });

      const authPayload = (authCall.data || null) as AuthorizeResponse | null;
      if (!authCall.response.ok || !authPayload) {
        setAuthorize({
          role: profileToLoad,
          requestedRoute: targetRoute,
          allowed: false,
          reason: String(authCall.data?.message || authCall.data?.error || 'authorize-request-failed'),
          canonicalRoute: '',
        });
        setRows([]);
        setSelectedRow(null);
        setEditorValue('');
        setLoading(false);
        return;
      }

      setAuthorize(authPayload);

      if (!authPayload.allowed) {
        setRows([]);
        setSelectedRow(null);
        setEditorValue('');
        setLoading(false);
        return;
      }

      const effectiveModule = (catalogCall.data?.modules || []).find((item: ModuleDef) => item.key === requestedModule);
      if (!effectiveModule) {
        const fallbackModule = catalogCall.data?.modules?.[0];
        if (fallbackModule) {
          navigate(`/building360/workspace/${catalogCall.data.profile}/${fallbackModule.key}`, { replace: true });
          return;
        }
      }

      await loadModuleRows(currentUser, requestedModule);
    } catch (error) {
      setErrorMessage(String(error instanceof Error ? error.message : error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!requestedModule) return;
    loadWorkspace();
  }, [requestedProfile, requestedModule]);

  useEffect(() => {
    setFlowRecords(loadFlowRecords());
  }, [requestedProfile, requestedModule]);

  const handleSelectRow = (row: any) => {
    setSelectedRow(row);
    setEditorValue(JSON.stringify(row, null, 2));
    setStatusMessage('');
    setErrorMessage('');
  };

  const handleSave = async () => {
    const currentUser = resolveCurrentUserSnapshot();
    if (!currentUser || !selectedModule || !moduleApi?.editPath) {
      setStatusMessage('Modulo em modo apenas leitura.');
      return;
    }

    let payload: any = null;
    try {
      payload = JSON.parse(editorValue);
    } catch {
      setErrorMessage('JSON invalido no editor.');
      return;
    }

    let endpoint = moduleApi.editPath;
    if (endpoint.includes(':id')) {
      const id = pickRowId(selectedRow || payload);
      if (!id) {
        setErrorMessage('Registo sem id para editar.');
        return;
      }
      endpoint = endpoint.replace(':id', encodeURIComponent(id));
    }

    const { response, data } = await requestJson(endpoint, {
      method: moduleApi.editMethod,
      headers: buildHeaders(currentUser),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setErrorMessage(String(data?.message || data?.error || `HTTP ${response.status}`));
      return;
    }

    setStatusMessage(moduleApi.editMethod === 'PATCH' ? 'Registo actualizado com sucesso.' : 'Registo criado/actualizado com sucesso.');
    setErrorMessage('');
    await loadModuleRows(currentUser, selectedModule.key);
  };

  const updateFlowRecords = (updater: (records: FlowRecord[]) => FlowRecord[]) => {
    const next = updater(loadFlowRecords());
    persistFlowRecords(next);
    setFlowRecords(next);
  };

  const handleCreateRequestFlow = () => {
    const actor = effectiveProfile || 'unknown';
    const id = `REQ-${Date.now()}`;
    const now = new Date().toISOString();
    const record: FlowRecord = {
      id,
      unit: 'A203',
      category: 'maintenance',
      status: 'request_opened',
      requestAt: now,
      actors: { requestBy: actor },
    };
    updateFlowRecords((records) => [record, ...records].slice(0, 50));
    setStatusMessage(`Fluxo iniciado: ${id}`);
    setErrorMessage('');
  };

  const handleAdvanceMaintenance = () => {
    const actor = effectiveProfile || 'unknown';
    const now = new Date().toISOString();
    updateFlowRecords((records) => {
      const target = records.find((item) => item.status === 'request_opened');
      if (!target) return records;
      target.status = 'maintenance_assigned';
      target.maintenanceAt = now;
      target.actors.maintenanceBy = actor;
      return [...records];
    });
    setStatusMessage('Fluxo avancou para Maintain360.');
    setErrorMessage('');
  };

  const handleAdvanceNotification = () => {
    const actor = effectiveProfile || 'unknown';
    const now = new Date().toISOString();
    updateFlowRecords((records) => {
      const target = records.find((item) => item.status === 'maintenance_assigned');
      if (!target) return records;
      target.status = 'notification_sent';
      target.notificationAt = now;
      target.actors.notificationBy = actor;
      return [...records];
    });
    setStatusMessage('Notificacao enviada para Community360.');
    setErrorMessage('');
  };

  const handleCloseHistory = () => {
    const actor = effectiveProfile || 'unknown';
    const now = new Date().toISOString();
    updateFlowRecords((records) => {
      const target = records.find((item) => item.status === 'notification_sent');
      if (!target) return records;
      target.status = 'history_closed';
      target.historyClosedAt = now;
      target.actors.historyBy = actor;
      return [...records];
    });
    setStatusMessage('Historico encerrado e auditavel.');
    setErrorMessage('');
  };

  const flowSummary = useMemo(() => {
    const total = flowRecords.length;
    const open = flowRecords.filter((item) => item.status !== 'history_closed').length;
    const closed = flowRecords.filter((item) => item.status === 'history_closed').length;
    return { total, open, closed };
  }, [flowRecords]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-300">A carregar workspace Building360...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">{catalog?.label || 'Building360 Workspace'}</h1>
            <p className="text-xs text-slate-400 mt-1">Perfil: {catalog?.profile || requestedProfile} | Fonte: {catalog?.source || 'core'}</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link className="px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-900" to="/building360">Portal Building360</Link>
            <Link className="px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-900" to="/portais">Portais</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isResidentShell && (
          <section className="rounded-2xl border border-emerald-700/40 bg-emerald-900/10 p-5">
            <h2 className="text-xl font-bold text-emerald-200">Portal do Residente</h2>
            <p className="text-sm text-slate-300 mt-1">Painel focado em pagamento, solicitacoes, acessos, reservas e comunicacao.</p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                <p className="text-slate-400">Solicitacoes abertas</p>
                <p className="mt-1 text-xl font-bold">{flowSummary.open}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                <p className="text-slate-400">Historico resolvido</p>
                <p className="mt-1 text-xl font-bold">{flowSummary.closed}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                <p className="text-slate-400">Total de fluxos</p>
                <p className="mt-1 text-xl font-bold">{flowSummary.total}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                <p className="text-slate-400">Unidade ativa</p>
                <p className="mt-1 text-xl font-bold">A203</p>
              </div>
            </div>
          </section>
        )}

        {isAdminShell && (
          <section className="rounded-2xl border border-sky-700/40 bg-sky-900/10 p-5">
            <h2 className="text-xl font-bold text-sky-200">Admin Console Building360</h2>
            <p className="text-sm text-slate-300 mt-1">Visao operacional integrada: propriedades, comunidade, manutencao, seguranca e finance.</p>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                <p className="text-slate-400">Fluxos ativos</p>
                <p className="mt-1 text-xl font-bold">{flowSummary.open}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                <p className="text-slate-400">Fluxos fechados</p>
                <p className="mt-1 text-xl font-bold">{flowSummary.closed}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                <p className="text-slate-400">Modulo atual</p>
                <p className="mt-1 text-base font-bold">{selectedModule?.title || requestedModule}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                <p className="text-slate-400">Perfil</p>
                <p className="mt-1 text-base font-bold">{effectiveProfile}</p>
              </div>
            </div>
          </section>
        )}

        {authorize && !authorize.allowed && (
          <div className="mt-4 rounded-xl border border-rose-700/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            Rota directa bloqueada para este perfil. Motivo: {authorize.reason}. Rota canonica: {authorize.canonicalRoute}
          </div>
        )}

        {!!catalog?.modules?.length && (
          <section className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {catalog.modules.map((module) => {
              const active = module.key === requestedModule;
              return (
                <Link
                  key={module.key}
                  to={`/building360/workspace/${catalog.profile}/${module.key}`}
                  className={`rounded-xl border p-4 transition-colors ${active ? 'border-sky-500 bg-slate-900' : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900'}`}
                >
                  <p className="text-sm font-bold text-white">{module.title}</p>
                  <p className="text-xs text-slate-300 mt-1">{module.subtitle}</p>
                  <p className="text-xs text-sky-300 mt-2">Acoes: {(module.actions || []).join(', ') || 'sem acoes'}</p>
                </Link>
              );
            })}
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-amber-700/40 bg-amber-900/10 p-4">
          <h2 className="text-lg font-bold text-amber-200">Flow Lab Interligado</h2>
          <p className="text-xs text-slate-300 mt-1">Request360 | Maintain360 | Notification | History com trilha persistente de auditoria local.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button data-testid="b360-flow-create" onClick={handleCreateRequestFlow} className="px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400">
              1) Criar Request
            </button>
            <button data-testid="b360-flow-maintain" onClick={handleAdvanceMaintenance} className="px-3 py-2 rounded-lg bg-sky-500 text-slate-950 font-bold hover:bg-sky-400">
              2) Encaminhar Maintain360
            </button>
            <button data-testid="b360-flow-notify" onClick={handleAdvanceNotification} className="px-3 py-2 rounded-lg bg-violet-500 text-white font-bold hover:bg-violet-400">
              3) Notificar Community360
            </button>
            <button data-testid="b360-flow-history" onClick={handleCloseHistory} className="px-3 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400">
              4) Fechar Historico
            </button>
          </div>

          <div className="mt-4 overflow-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="bg-slate-900">
                <tr>
                  <th className="text-left p-2">Flow ID</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Request</th>
                  <th className="text-left p-2">Maintain</th>
                  <th className="text-left p-2">Notify</th>
                  <th className="text-left p-2">History</th>
                </tr>
              </thead>
              <tbody>
                {flowRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-3 text-slate-400">Sem fluxos registados.</td>
                  </tr>
                ) : (
                  flowRecords.map((item) => (
                    <tr key={item.id} className="border-t border-slate-800">
                      <td className="p-2 text-slate-200" data-testid="b360-flow-id">{item.id}</td>
                      <td className="p-2 text-amber-200" data-testid="b360-flow-status">{item.status}</td>
                      <td className="p-2 text-slate-300">{item.requestAt ? 'ok' : '-'}</td>
                      <td className="p-2 text-slate-300">{item.maintenanceAt ? 'ok' : '-'}</td>
                      <td className="p-2 text-slate-300">{item.notificationAt ? 'ok' : '-'}</td>
                      <td className="p-2 text-slate-300">{item.historyClosedAt ? 'ok' : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-5">
          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-lg font-bold">Lista Operacional</h2>
            <p className="text-xs text-slate-400 mt-1">Modulo: {selectedModule?.title || requestedModule}</p>

            {errorMessage && (
              <p className="mt-3 rounded-lg border border-rose-700/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">{errorMessage}</p>
            )}

            <div className="mt-4 max-h-[460px] overflow-auto rounded-lg border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 sticky top-0">
                  <tr>
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">Resumo</th>
                    <th className="text-left p-2">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td className="p-3 text-slate-400" colSpan={3}>Sem dados para este modulo.</td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const rowId = pickRowId(row) || '-';
                      const summary = row?.name || row?.title || row?.number || row?.status || row?.role || 'Registo';
                      return (
                        <tr key={`${rowId}-${summary}`} className="border-t border-slate-800">
                          <td className="p-2 text-slate-200">{rowId}</td>
                          <td className="p-2 text-slate-300">{String(summary)}</td>
                          <td className="p-2">
                            <button
                              onClick={() => handleSelectRow(row)}
                              className="px-2 py-1 rounded-md border border-slate-700 hover:bg-slate-800"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-lg font-bold">Editor do Modulo</h2>
            <p className="text-xs text-slate-400 mt-1">Suporta PATCH/POST via proxy server-side local.</p>

            {statusMessage && (
              <p className="mt-3 rounded-lg border border-emerald-700/40 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">{statusMessage}</p>
            )}

            <textarea
              value={editorValue}
              onChange={(event) => setEditorValue(event.target.value)}
              className="mt-4 w-full h-[360px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200"
              spellCheck={false}
            />

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-sky-500 text-slate-950 font-bold hover:bg-sky-400"
              >
                Guardar Alteracoes
              </button>
              <button
                onClick={() => setEditorValue(selectedRow ? JSON.stringify(selectedRow, null, 2) : '{}')}
                className="px-4 py-2 rounded-lg border border-slate-700 hover:bg-slate-800"
              >
                Repor
              </button>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
};

export default Building360WorkspacePage;
