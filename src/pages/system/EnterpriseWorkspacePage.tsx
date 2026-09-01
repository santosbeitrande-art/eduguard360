import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { withTimeout } from '@/lib/networkPerformance';
import { isEnterpriseRole, normalizeEnterpriseRole, resolvePortalRouteByRole } from '@/lib/enterpriseGovernance';

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

type AccessProfile = {
  role: string;
  permissions: Record<PermissionDomain, PermissionAction[]>;
};

type ModuleDef = {
  slug: string;
  title: string;
  domain: PermissionDomain;
  backendTarget: 'users' | 'listings' | 'reservations' | 'payments' | 'enterprise';
};

const toModuleSlug = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const moduleCatalog: Record<string, ModuleDef[]> = {
  director: [
    { slug: 'instituicao', title: 'Instituição', domain: 'schools', backendTarget: 'enterprise' },
    { slug: 'utilizadores', title: 'Utilizadores', domain: 'users', backendTarget: 'users' },
    { slug: 'aprovacoes', title: 'Aprovações', domain: 'workflow', backendTarget: 'enterprise' },
    { slug: 'relatorios', title: 'Relatórios', domain: 'analytics', backendTarget: 'enterprise' },
    { slug: 'auditoria', title: 'Auditoria', domain: 'security', backendTarget: 'enterprise' },
  ],
  secretaria: [
    { slug: 'matriculas', title: 'Matrículas', domain: 'enrollments', backendTarget: 'reservations' },
    { slug: 'alunos', title: 'Alunos', domain: 'students', backendTarget: 'users' },
    { slug: 'turmas', title: 'Turmas', domain: 'classes', backendTarget: 'listings' },
    { slug: 'certificados', title: 'Declarações e Certificados', domain: 'documents', backendTarget: 'enterprise' },
    { slug: 'calendario', title: 'Calendário', domain: 'schedule', backendTarget: 'listings' },
  ],
  financeiro: [
    { slug: 'propinas', title: 'Propinas', domain: 'payments', backendTarget: 'payments' },
    { slug: 'faturas', title: 'Faturas', domain: 'payments', backendTarget: 'payments' },
    { slug: 'pagamentos', title: 'Pagamentos', domain: 'payments', backendTarget: 'payments' },
    { slug: 'bolsas-dividas', title: 'Bolsas e Dívidas', domain: 'payments', backendTarget: 'payments' },
    { slug: 'reconciliacao', title: 'Reconciliação', domain: 'payments', backendTarget: 'payments' },
  ],
  professor: [
    { slug: 'minhas-turmas', title: 'Minhas Turmas', domain: 'classes', backendTarget: 'listings' },
    { slug: 'frequencia', title: 'Frequência', domain: 'attendance', backendTarget: 'enterprise' },
    { slug: 'avaliacoes', title: 'Avaliações', domain: 'grades', backendTarget: 'enterprise' },
    { slug: 'comunicacao-ocorrencias', title: 'Comunicação e Ocorrências', domain: 'incidents', backendTarget: 'enterprise' },
    { slug: 'horarios', title: 'Horários', domain: 'schedule', backendTarget: 'listings' },
  ],
  seguranca: [
    { slug: 'controlo-de-entradas', title: 'Controlo de Entradas', domain: 'qr', backendTarget: 'enterprise' },
    { slug: 'ocorrencias', title: 'Ocorrências', domain: 'incidents', backendTarget: 'enterprise' },
    { slug: 'conformidade', title: 'Conformidade', domain: 'security', backendTarget: 'enterprise' },
  ],
  coordenador: [
    { slug: 'disciplinas', title: 'Disciplinas', domain: 'disciplines', backendTarget: 'listings' },
    { slug: 'horarios', title: 'Horários', domain: 'schedule', backendTarget: 'listings' },
    { slug: 'curriculos', title: 'Currículos', domain: 'courses', backendTarget: 'listings' },
    { slug: 'professores', title: 'Professores', domain: 'teachers', backendTarget: 'users' },
    { slug: 'planeamento', title: 'Planeamento', domain: 'workflow', backendTarget: 'enterprise' },
  ],
  rh: [
    { slug: 'funcionarios', title: 'Funcionários', domain: 'employees', backendTarget: 'users' },
    { slug: 'contratos', title: 'Contratos', domain: 'employees', backendTarget: 'users' },
    { slug: 'ferias', title: 'Férias', domain: 'employees', backendTarget: 'users' },
    { slug: 'avaliacoes', title: 'Avaliações', domain: 'employees', backendTarget: 'users' },
    { slug: 'formacao', title: 'Formação', domain: 'documents', backendTarget: 'enterprise' },
  ],
  administrator: [
    { slug: 'utilizadores', title: 'Utilizadores', domain: 'users', backendTarget: 'users' },
    { slug: 'alunos', title: 'Alunos', domain: 'students', backendTarget: 'users' },
    { slug: 'matriculas', title: 'Matrículas', domain: 'enrollments', backendTarget: 'reservations' },
    { slug: 'documentos', title: 'Documentos', domain: 'documents', backendTarget: 'enterprise' },
  ],
  super_admin: [
    { slug: 'instituicao-global', title: 'Instituição Global', domain: 'schools', backendTarget: 'enterprise' },
    { slug: 'utilizadores', title: 'Utilizadores', domain: 'users', backendTarget: 'users' },
    { slug: 'analytics', title: 'Analytics', domain: 'analytics', backendTarget: 'enterprise' },
    { slug: 'seguranca-auditoria', title: 'Segurança e Auditoria', domain: 'security', backendTarget: 'enterprise' },
    { slug: 'workflows', title: 'Workflows', domain: 'workflow', backendTarget: 'enterprise' },
  ],
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

const buildHeaders = (currentUser: any): HeadersInit => {
  const token = localStorage.getItem('eduguard_token') || localStorage.getItem('token') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-enterprise-role': String(currentUser?.perfil || currentUser?.role || ''),
    'x-user-id': String(currentUser?.id || currentUser?.user_id || ''),
    'x-user-name': String(currentUser?.nome || currentUser?.name || currentUser?.email || ''),
    'x-school-id': String(currentUser?.escola_id || currentUser?.school_id || currentUser?.tenant_id || ''),
    'x-tenant-id': String(currentUser?.tenant_id || currentUser?.escola_id || currentUser?.school_id || ''),
  };
};

const formatErrorMessage = (data: any): string => {
  if (typeof data === 'string') return data.slice(0, 200);
  if (data?.message) return String(data.message).slice(0, 200);
  if (data?.error) return String(data.error).slice(0, 200);
  try {
    return JSON.stringify(data).slice(0, 200);
  } catch {
    return 'Erro desconhecido';
  }
};

const EnterpriseWorkspacePage = () => {
  const { role, module } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [accessProfile, setAccessProfile] = useState<AccessProfile | null>(null);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [moduleData, setModuleData] = useState<any[]>([]);

  const normalizedRole = useMemo(() => normalizeEnterpriseRole(role), [role]);
  const modules = useMemo(() => moduleCatalog[normalizedRole] || moduleCatalog.administrator, [normalizedRole]);
  const selectedModule = useMemo(
    () =>
      modules.find((item) => item.slug === module || toModuleSlug(item.title) === String(module || '').toLowerCase()) || modules[0],
    [modules, module]
  );

  const can = (domain: PermissionDomain, action: PermissionAction): boolean => {
    const actions = accessProfile?.permissions?.[domain] || [];
    return Array.isArray(actions) && actions.includes(action);
  };

  const requestJson = async (url: string, init: RequestInit, timeoutLabel: string) => {
    const response = await withTimeout(fetch(url, init), 10000, timeoutLabel);
    const text = await response.text();
    let data: any = null;
    
    try {
      // Verificar se a resposta é JSON válida
      if (text && response.headers.get('content-type')?.includes('application/json')) {
        data = JSON.parse(text);
      } else if (text && !response.ok) {
        // Se resposta falhou, tentar parsear mesmo assim (pode ser erro JSON)
        try {
          data = JSON.parse(text);
        } catch {
          // Se falhar, usar texto puro
          data = {
            error: 'response-parse-error',
            message: text.slice(0, 200),
            fullError: text,
          };
        }
      } else if (text) {
        data = JSON.parse(text);
      }
    } catch (error) {
      data = {
        error: 'parse-error',
        message: `Falha ao fazer parsing da resposta: ${String(error).slice(0, 100)}`,
        raw: text.slice(0, 200),
      };
    }
    
    return { response, data };
  };

  const loadModuleData = async (currentUser: any, selected: ModuleDef) => {
    const headers = buildHeaders(currentUser);

    try {
      if (selected.backendTarget === 'users') {
        const userId = String(currentUser?.id || currentUser?.user_id || '').trim();
        if (!userId) {
          setModuleData([]);
          return;
        }
        const { response, data } = await requestJson(`/api/v1/users/${encodeURIComponent(userId)}`, { headers }, 'Workspace user load timeout');
        setModuleData(response.ok && data ? [data] : []);
        return;
      }

      if (selected.backendTarget === 'listings') {
        const { response, data } = await requestJson('/api/v1/listings?page=1&limit=20', { headers }, 'Workspace listings load timeout');
        const rows = Array.isArray(data?.data) ? data.data : [];
        setModuleData(response.ok ? rows : []);
        return;
      }

      if (selected.backendTarget === 'reservations') {
        const { response, data } = await requestJson('/api/v1/reservations?role=buyer&page=1&limit=20', { headers }, 'Workspace reservations load timeout');
        const rows = Array.isArray(data?.data) ? data.data : [];
        setModuleData(response.ok ? rows : []);
        return;
      }

      if (selected.backendTarget === 'payments') {
        const { response, data } = await requestJson('/api/payouts/earnings', { headers }, 'Workspace payments load timeout');
        setModuleData(response.ok && data ? [data] : []);
        return;
      }

      setModuleData([]);
    } catch {
      // Falha no endpoint do módulo não deve bloquear o workspace
      setModuleData([]);
    }
  };

  const loadWorkspace = async () => {
    setLoading(true);
    setMessage('');

    const currentUser = resolveCurrentUserSnapshot();
    if (!currentUser) {
      navigate('/sistema');
      return;
    }

    const currentRole = normalizeEnterpriseRole(currentUser?.perfil || currentUser?.role);
    if (!isEnterpriseRole(currentRole)) {
      navigate(resolvePortalRouteByRole(currentRole));
      return;
    }

    const headers = buildHeaders(currentUser);

    try {
      const resolvedRes = await withTimeout(
        fetch('/api/v1/enterprise/rbac/resolve', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            role: String(currentUser?.perfil || currentUser?.role || ''),
            schoolId: String(currentUser?.escola_id || currentUser?.school_id || currentUser?.tenant_id || ''),
            tenantId: String(currentUser?.tenant_id || currentUser?.escola_id || currentUser?.school_id || ''),
            userId: String(currentUser?.id || currentUser?.user_id || ''),
          }),
        }),
        8000,
        'Workspace resolve timeout'
      );

      if (resolvedRes.ok) {
        setAccessProfile(await resolvedRes.json());
      }
    } catch {
      // RBAC resolve falhou — continuar sem perfil de acesso (botões ficam desabilitados)
    }

    try {
      const workflowsRes = await withTimeout(
        fetch('/api/v1/enterprise/workflows', { headers }),
        8000,
        'Workspace workflows timeout'
      );
      if (workflowsRes.ok) {
        const data = await workflowsRes.json();
        setWorkflows(Array.isArray(data?.data) ? data.data : []);
      }
    } catch {
      // Workflows não disponíveis — sem fluxos recentes
    }

    try {
      if (selectedModule) {
        await loadModuleData(currentUser, selectedModule);
      }
    } catch {
      setModuleData([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadWorkspace();
  }, [role, module]);

  const handleNew = async () => {
    try {
    const currentUser = resolveCurrentUserSnapshot();
    if (!currentUser || !selectedModule) return;

    const headers = buildHeaders(currentUser);

    if (selectedModule.backendTarget === 'listings') {
      const { response, data } = await requestJson('/api/v1/listings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: `${selectedModule.title} ${new Date().toISOString().slice(0, 10)}`,
          description: 'Registo criado no workspace enterprise.',
          type: 'paper',
          weight: 1,
          price: 0,
          latitude: -25.96553,
          longitude: 32.58322,
          address: 'Campus Principal',
        }),
      }, 'Workspace listing create timeout');

      if (response.ok) {
        setMessage('Novo registo criado no módulo de listings.');
        await loadWorkspace();
      } else {
        const errorMsg = typeof data === 'string' ? data : (data?.message || data?.error || JSON.stringify(data));
        setMessage(`Falha ao criar listing: ${errorMsg}`);
      }
      return;
    }

    if (selectedModule.backendTarget === 'reservations') {
      const listingId = String((moduleData.find((item: any) => item?.listingId)?.listingId) || '');
      if (!listingId) {
        setMessage('Sem listing associado para criar reserva.');
        return;
      }

      const { response, data } = await requestJson(`/api/v1/reservations/listings/${encodeURIComponent(listingId)}/reserve`, {
        method: 'POST',
        headers,
      }, 'Workspace reservation create timeout');

      if (response.ok) {
        setMessage('Nova reserva criada com sucesso.');
        await loadWorkspace();
      } else {
        const errorMsg = typeof data === 'string' ? data : (data?.message || data?.error || JSON.stringify(data));
        setMessage(`Falha ao criar reserva: ${errorMsg}`);
      }
      return;
    }

    if (selectedModule.backendTarget === 'payments') {
      const { response, data } = await requestJson('/api/payments/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          courseId: '00000000-0000-0000-0000-000000000000',
          amount: 0,
          paymentMethod: 'bank_transfer',
        }),
      }, 'Workspace payment create timeout');

      if (response.ok) {
        setMessage('Pedido de pagamento criado no módulo financeiro.');
        await loadWorkspace();
      } else {
        const errorMsg = typeof data === 'string' ? data : (data?.message || data?.error || JSON.stringify(data));
        setMessage(`Falha ao criar pagamento: ${errorMsg}`);
      }
      return;
    }

    const body = {
      title: `${selectedModule.title} - nova solicitação`,
      type: selectedModule.domain,
      requester: String(currentUser?.nome || currentUser?.name || currentUser?.email || 'Utilizador'),
      owner: normalizedRole,
      priority: 'medium',
      steps: [
        { stepName: 'Submissão', ownerRole: 'secretaria' },
        { stepName: 'Validação Pedagógica', ownerRole: 'coordenador' },
        { stepName: 'Aprovação Institucional', ownerRole: 'director' },
        { stepName: 'Confirmação Financeira', ownerRole: 'financeiro' },
        { stepName: 'Concluído', ownerRole: 'administrator' },
      ],
    };

    const response = await fetch('/api/v1/enterprise/workflows', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (response.ok) {
      setMessage('Novo fluxo criado com sucesso.');
      await loadWorkspace();
      return;
    }

    const error = await response.text();
    const errorData = (() => {
      try { return JSON.parse(error); } catch { return { message: error }; }
    })();
    setMessage(`Falha ao criar: ${formatErrorMessage(errorData)}`);
    } catch (e) {
      setMessage(`Erro ao executar ação Novo: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
    }
  };

  const handleEdit = async () => {
    try {
    const currentUser = resolveCurrentUserSnapshot();
    if (!currentUser || !selectedModule) return;

    const headers = buildHeaders(currentUser);

    if (selectedModule.backendTarget === 'users') {
      const userId = String(currentUser?.id || currentUser?.user_id || '').trim();
      if (!userId) {
        setMessage('Utilizador atual sem identificador para edição.');
        return;
      }

      const { response, data } = await requestJson(`/api/v1/users/${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({}),
      }, 'Workspace user edit timeout');

      if (response.ok) {
        setMessage('Endpoint de edição de utilizador executado com sucesso.');
        await loadWorkspace();
      } else {
        setMessage(`Falha ao editar utilizador: ${formatErrorMessage(data)}`);
      }
      return;
    }

    if (selectedModule.backendTarget === 'listings') {
      const listingId = String((moduleData.find((item: any) => item?.id)?.id) || '');
      if (!listingId) {
        setMessage('Sem listing disponível para edição.');
        return;
      }

      const { response, data } = await requestJson(`/api/v1/listings/${encodeURIComponent(listingId)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          description: `Atualizado via workspace por ${normalizedRole}`,
        }),
      }, 'Workspace listing edit timeout');

      if (response.ok) {
        setMessage('Listing atualizado com sucesso.');
        await loadWorkspace();
      } else {
        setMessage(`Falha ao editar listing: ${formatErrorMessage(data)}`);
      }
      return;
    }

    if (selectedModule.backendTarget === 'reservations') {
      const reservationId = String((moduleData.find((item: any) => item?.id)?.id) || '');
      if (!reservationId) {
        setMessage('Sem reserva disponível para edição/cancelamento.');
        return;
      }

      const { response, data } = await requestJson(`/api/v1/reservations/${encodeURIComponent(reservationId)}/cancel`, {
        method: 'POST',
        headers,
      }, 'Workspace reservation cancel timeout');

      if (response.ok) {
        setMessage('Reserva atualizada (cancelada) com sucesso.');
        await loadWorkspace();
      } else {
        setMessage(`Falha ao atualizar reserva: ${formatErrorMessage(data)}`);
      }
      return;
    }

    if (selectedModule.backendTarget === 'payments') {
      const { response, data } = await requestJson('/api/payouts/earnings', {
        method: 'GET',
        headers,
      }, 'Workspace payment earnings timeout');

      if (response.ok) {
        setMessage('Módulo financeiro sincronizado via endpoint protegido.');
        setModuleData(Array.isArray(data) ? data : [data]);
      } else {
        setMessage(`Falha ao sincronizar pagamentos: ${formatErrorMessage(data)}`);
      }
      return;
    }

    const policyKey = `workspace.${normalizedRole}.${selectedModule.slug}.last-edit`;
    const response = await fetch(`/api/v1/enterprise/security/policies?key=${encodeURIComponent(policyKey)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        value: {
          editedAt: new Date().toISOString(),
          module: selectedModule.slug,
          role: normalizedRole,
        },
        updatedBy: String(currentUser?.nome || currentUser?.name || currentUser?.email || 'Utilizador'),
      }),
    });

    if (response.ok) {
      setMessage('Registo de edição aplicado com sucesso.');
      return;
    }

    const error = await response.text();
    setMessage(`Falha ao editar: ${formatErrorMessage({ message: error })}`);
    } catch (e) {
      setMessage(`Erro ao editar: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
    }
  };

  const handleApprove = async () => {
    try {
    const currentUser = resolveCurrentUserSnapshot();
    if (!currentUser || !selectedModule) return;

    const headers = buildHeaders(currentUser);

    if (selectedModule.backendTarget === 'reservations') {
      const reservationId = String((moduleData.find((item: any) => item?.id)?.id) || '');
      if (!reservationId) {
        setMessage('Sem reserva disponível para aprovação/conclusão.');
        return;
      }

      const { response, data } = await requestJson(`/api/v1/reservations/${encodeURIComponent(reservationId)}/complete`, {
        method: 'POST',
        headers,
      }, 'Workspace reservation complete timeout');

      if (response.ok) {
        setMessage('Reserva concluída/aprovada com sucesso.');
        await loadWorkspace();
      } else {
        setMessage(`Falha ao aprovar reserva: ${formatErrorMessage(data)}`);
      }
      return;
    }

    const active = workflows.find((item) => item?.status === 'pending' || item?.status === 'in_review');
    if (!active?.id) {
      setMessage('Nenhum workflow pendente para aprovar neste momento.');
      return;
    }

    const response = await fetch(`/api/v1/enterprise/workflows/${active.id}/advance`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        actor: String(currentUser?.nome || currentUser?.name || currentUser?.email || 'Utilizador'),
        notes: `Aprovação em ${selectedModule?.title || 'módulo'}`,
        targetStatus: 'approved',
      }),
    });

    if (response.ok) {
      setMessage('Etapa de workflow avançada com sucesso.');
      await loadWorkspace();
      return;
    }

    const error = await response.text();
    const errorData = (() => {
      try {
        return JSON.parse(error);
      } catch {
        return { message: error };
      }
    })();
    setMessage(`Falha ao aprovar: ${formatErrorMessage(errorData)}`);
    } catch (e) {
      setMessage(`Erro ao aprovar: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
    }
  };

  const handleExport = async () => {
    try {
    const currentUser = resolveCurrentUserSnapshot();
    if (!currentUser || !selectedModule) return;

    const headers = buildHeaders(currentUser);
    let rows: any[] = [];

    if (selectedModule.backendTarget === 'users') {
      const userId = String(currentUser?.id || currentUser?.user_id || '').trim();
      const { response, data } = await requestJson(`/api/v1/users/${encodeURIComponent(userId)}/ratings?page=1&limit=50`, { headers }, 'Workspace users export timeout');
      if (!response.ok) {
        setMessage(`Falha ao exportar utilizadores: ${formatErrorMessage(data)}`);
        return;
      }
      rows = Array.isArray(data?.data) ? data.data : [];
    } else if (selectedModule.backendTarget === 'listings') {
      const { response, data } = await requestJson('/api/v1/listings?page=1&limit=50', { headers }, 'Workspace listings export timeout');
      if (!response.ok) {
        setMessage(`Falha ao exportar listings: ${formatErrorMessage(data)}`);
        return;
      }
      rows = Array.isArray(data?.data) ? data.data : [];
    } else if (selectedModule.backendTarget === 'reservations') {
      const { response, data } = await requestJson('/api/v1/reservations?role=buyer&page=1&limit=50', { headers }, 'Workspace reservations export timeout');
      if (!response.ok) {
        setMessage(`Falha ao exportar reservas: ${formatErrorMessage(data)}`);
        return;
      }
      rows = Array.isArray(data?.data) ? data.data : [];
    } else if (selectedModule.backendTarget === 'payments') {
      const { response, data } = await requestJson('/api/payouts/earnings', { headers }, 'Workspace payments export timeout');
      if (!response.ok) {
        setMessage(`Falha ao exportar pagamentos: ${formatErrorMessage(data)}`);
        return;
      }
      rows = Array.isArray(data) ? data : [data];
    } else {
      const { response, data } = await requestJson('/api/v1/enterprise/audit?limit=120', { headers }, 'Workspace audit export timeout');
      if (!response.ok) {
        setMessage(`Falha ao exportar auditoria: ${formatErrorMessage(data)}`);
        return;
      }
      rows = Array.isArray(data?.data) ? data.data : [];
    }

    const csv = [
      ['payload'].join(','),
      ...rows.map((row: any) => [JSON.stringify(JSON.stringify(row || {}))].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${selectedModule.slug}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setMessage('Exportação concluída.');
    } catch (e) {
      setMessage(`Erro ao exportar: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">A carregar espaço de trabalho...</div>;
  }

  if (!selectedModule) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-200">Módulo não encontrado.</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white px-4 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{selectedModule.title}</h1>
            <p className="text-sm text-slate-300">Perfil: {normalizedRole} · Domínio: {selectedModule.domain}</p>
          </div>
          <Link to="/enterprise" className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">Voltar ao Enterprise</Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold mb-3">Menu do Perfil</h2>
          <div className="flex flex-wrap gap-2">
            {modules.map((item) => (
              <Link
                key={item.slug}
                to={`/enterprise/workspace/${normalizedRole}/${toModuleSlug(item.title)}`}
                className={`rounded-lg px-3 py-2 text-sm ${item.slug === selectedModule.slug ? 'bg-emerald-500 text-slate-950 font-semibold' : 'bg-white/10 hover:bg-white/15'}`}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold mb-3">Ações de Trabalho</h2>
          <p className="mb-3 text-xs text-slate-400">Target backend: {selectedModule.backendTarget}</p>
          <div className="grid gap-3 md:grid-cols-4">
            <button onClick={handleNew} disabled={!can(selectedModule.domain, 'create')} className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-40">Novo</button>
            <button onClick={handleEdit} disabled={!can(selectedModule.domain, 'update')} className="rounded-xl bg-blue-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-40">Editar</button>
            <button onClick={handleApprove} disabled={!can(selectedModule.domain, 'approve')} className="rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-40">Aprovar</button>
            <button onClick={handleExport} disabled={!can(selectedModule.domain, 'export')} className="rounded-xl bg-white/20 px-4 py-2 font-semibold disabled:opacity-40">Exportar</button>
          </div>
          {message && <p className="mt-3 text-sm text-slate-300">{message}</p>}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold mb-3">Dados do Módulo</h2>
          {moduleData.length === 0 ? (
            <p className="text-slate-400 text-sm">Sem dados retornados pelo endpoint do módulo.</p>
          ) : (
            <div className="space-y-2">
              {moduleData.slice(0, 8).map((item: any, index: number) => (
                <div key={`${selectedModule.slug}-item-${index}`} className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">
                  <p className="text-xs text-slate-300 break-all">{JSON.stringify(item)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold mb-3">Fluxos Recentes</h2>
          {workflows.length === 0 ? (
            <p className="text-slate-400 text-sm">Sem workflows disponíveis no escopo atual.</p>
          ) : (
            <div className="space-y-2">
              {workflows.slice(0, 8).map((wf: any) => (
                <div key={wf.id} className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2">
                  <p className="font-semibold">{wf.title}</p>
                  <p className="text-xs text-slate-400">{wf.type} · {wf.status} · etapa {Number(wf.currentStep || 0) + 1}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnterpriseWorkspacePage;
