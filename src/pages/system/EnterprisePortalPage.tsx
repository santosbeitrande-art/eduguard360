import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/networkPerformance';
import { isEnterpriseRole, normalizeEnterpriseRole, resolvePortalRouteByRole } from '@/lib/enterpriseGovernance';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  GraduationCap,
  KeyRound,
  Layers3,
  MessagesSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';

type EnterpriseRole =
  | 'super_admin'
  | 'director'
  | 'administrator'
  | 'secretaria'
  | 'coordenador'
  | 'professor'
  | 'financeiro'
  | 'rh'
  | 'seguranca'
  | 'parent'
  | 'student'
  | 'other';
type DashboardLens = 'director' | 'teacher' | 'secretaria' | 'financeiro';

type EnterpriseCard = {
  title: string;
  value: string;
  subtitle: string;
  accent: string;
  icon: ReactNode;
};

type PendingItem = {
  id: string;
  title: string;
  owner: string;
  count: number;
  tone: 'amber' | 'sky' | 'rose' | 'emerald';
};

type TimelineEvent = {
  id: string;
  at: string;
  label: string;
  detail: string;
  tone: 'emerald' | 'sky' | 'amber';
};

const isRelevantRole = (perfil: unknown) => {
  const role = normalizeEnterpriseRole(perfil);
  return role !== 'unknown' && role !== 'parent' && role !== 'student';
};

const getRoleLabel = (perfil: unknown): EnterpriseRole => {
  const role = normalizeEnterpriseRole(perfil);
  if (role === 'super_admin') return 'super_admin';
  if (role === 'director') return 'director';
  if (role === 'administrator') return 'administrator';
  if (role === 'secretaria') return 'secretaria';
  if (role === 'coordenador') return 'coordenador';
  if (role === 'professor') return 'professor';
  if (role === 'financeiro') return 'financeiro';
  if (role === 'rh') return 'rh';
  if (role === 'seguranca') return 'seguranca';
  if (role === 'parent') return 'parent';
  if (role === 'student') return 'student';
  return 'other';
};

const getRoleDisplayLabel = (role: EnterpriseRole): string => {
  if (role === 'super_admin') return 'Super Administrador';
  if (role === 'director') return 'Diretor';
  if (role === 'administrator') return 'Administrador';
  if (role === 'secretaria') return 'Secretaria';
  if (role === 'coordenador') return 'Coordenador';
  if (role === 'professor') return 'Professor';
  if (role === 'financeiro') return 'Financeiro';
  if (role === 'rh') return 'RH';
  if (role === 'seguranca') return 'Segurança';
  if (role === 'parent') return 'Encarregado';
  if (role === 'student') return 'Aluno';
  return 'Outro';
};

const toneClass = {
  amber: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  sky: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
  rose: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
  emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
};

const EnterprisePortalPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staffSearch, setStaffSearch] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [dashboardLens, setDashboardLens] = useState<DashboardLens>('director');

  const [stats, setStats] = useState({
    schools: 0,
    staff: 0,
    directors: 0,
    teachers: 0,
    security: 0,
    parents: 0,
    pendingUsers: 0,
  });

  const [schools, setSchools] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [enterpriseOverview, setEnterpriseOverview] = useState<any | null>(null);

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

  const buildEnterpriseHeaders = (currentUser: any): HeadersInit => ({
    'Content-Type': 'application/json',
    'x-enterprise-role': String(currentUser?.perfil || currentUser?.role || ''),
    'x-user-id': String(currentUser?.id || currentUser?.user_id || ''),
    'x-user-name': String(currentUser?.nome || currentUser?.name || currentUser?.email || ''),
    'x-school-id': String(currentUser?.escola_id || currentUser?.school_id || currentUser?.tenant_id || ''),
    'x-tenant-id': String(currentUser?.tenant_id || currentUser?.escola_id || currentUser?.school_id || ''),
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [schoolsRes, usersRes, studentsRes] = await Promise.all([
        withTimeout(supabase.from('escolas').select('id,nome,email,telefone,endereco').order('nome'), 12000, 'Enterprise schools timeout'),
        withTimeout(supabase.from('utilizadores').select('id,nome,email,telefone,perfil,escola_id,status,is_active').order('nome'), 12000, 'Enterprise users timeout'),
        withTimeout(supabase.from('alunos').select('id,nome,classe,encarregado_id,escola_id').limit(5000), 12000, 'Enterprise students timeout'),
      ]);

      const schoolsData = Array.isArray(schoolsRes.data) ? schoolsRes.data : [];
      const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
      const studentsData = Array.isArray(studentsRes.data) ? studentsRes.data : [];

      const staffData = usersData
        .filter((user: any) => isRelevantRole(user?.perfil))
        .map((user: any) => ({
          ...user,
          roleKey: getRoleLabel(user?.perfil),
          roleLabel: getRoleDisplayLabel(getRoleLabel(user?.perfil)),
          schoolName: schoolsData.find((school: any) => String(school.id) === String(user.escola_id))?.nome || 'Sem escola associada',
          source: 'remote',
        }));

      setSchools(schoolsData);
      setUsers(usersData);
      setStudents(studentsData);
      setStaff(staffData);

      const pendingUsers = usersData.filter((item: any) => item?.status === 'pending' || item?.is_active === false).length;
      setStats({
        schools: schoolsData.length,
        staff: staffData.length,
        directors: staffData.filter((item: any) => item.roleKey === 'director').length,
        teachers: staffData.filter((item: any) => item.roleKey === 'professor').length,
        security: staffData.filter((item: any) => item.roleKey === 'seguranca').length,
        parents: usersData.filter((item: any) => getRoleLabel(item?.perfil) === 'parent' || studentsData.some((student: any) => String(student.encarregado_id) === String(item.id))).length,
        pendingUsers,
      });

      try {
        const currentUser = resolveCurrentUserSnapshot();
        const enterpriseHeaders = currentUser ? buildEnterpriseHeaders(currentUser) : undefined;

        const overviewRes = await withTimeout(
          fetch('/api/v1/enterprise/overview', {
            headers: enterpriseHeaders,
          }),
          10000,
          'Enterprise overview timeout'
        );
        if (overviewRes.ok) {
          const overviewData = await overviewRes.json();
          setEnterpriseOverview(overviewData);
        }

        if (currentUser) {
          const heartbeatBody = {
            userId: String(currentUser.id || currentUser.user_id || 'guest-user'),
            userName: String(currentUser.nome || currentUser.name || currentUser.email || 'Utilizador'),
            userRole: String(currentUser.perfil || currentUser.role || 'staff'),
            device: navigator.platform || 'web',
            browser: navigator.userAgent,
            location: 'Portal Enterprise',
            trusted: true,
          };

          const heartbeatRes = await withTimeout(
            fetch('/api/v1/enterprise/sessions', {
              method: 'POST',
              headers: enterpriseHeaders,
              body: JSON.stringify(heartbeatBody),
            }),
            8000,
            'Enterprise session heartbeat timeout'
          );

          if (heartbeatRes.ok) {
            const heartbeat = await heartbeatRes.json();
            if (heartbeat?.id) {
              localStorage.setItem('eduguard_enterprise_session_id', String(heartbeat.id));
            }
          }

          await withTimeout(
            fetch('/api/v1/enterprise/audit', {
              method: 'POST',
              headers: enterpriseHeaders,
              body: JSON.stringify({
                actorId: heartbeatBody.userId,
                actorName: heartbeatBody.userName,
                actorRole: heartbeatBody.userRole,
                action: 'enterprise_portal_viewed',
                resourceType: 'enterprise_dashboard',
                metadata: { lens: dashboardLens },
                userAgent: navigator.userAgent,
              }),
            }),
            8000,
            'Enterprise audit write timeout'
          );
        }
      } catch (overviewError) {
        console.warn('Enterprise backend blocks unavailable, using local fallback:', overviewError);
      }
    } catch (error) {
      console.error('Erro ao carregar Enterprise Portal:', error);
      const cachedSchoolsRaw = localStorage.getItem('eduguard_admin_schools_cache');
      const cachedUsersRaw = localStorage.getItem('eduguard_locally_approved_users');
      const cachedSchools = cachedSchoolsRaw ? JSON.parse(cachedSchoolsRaw) : [];
      const cachedUsers = cachedUsersRaw ? JSON.parse(cachedUsersRaw) : [];
      setSchools(Array.isArray(cachedSchools) ? cachedSchools : []);
      setUsers(Array.isArray(cachedUsers) ? cachedUsers : []);
      setStudents([]);
      setStaff(
        (Array.isArray(cachedUsers) ? cachedUsers : []).map((user: any) => ({
          ...user,
          roleLabel: getRoleLabel(user?.perfil),
          schoolName: 'Cache local',
          source: 'local',
        }))
      );
      setEnterpriseOverview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentUserRaw = localStorage.getItem('currentUser') || localStorage.getItem('eduguard_user');
    if (!currentUserRaw) {
      navigate('/login');
      return;
    }

    try {
      const parsed = JSON.parse(currentUserRaw);
      const role = normalizeEnterpriseRole(parsed?.perfil || parsed?.role);

      if (!isEnterpriseRole(role)) {
        navigate(resolvePortalRouteByRole(role));
        return;
      }

      if (role === 'professor') setDashboardLens('teacher');
      if (role === 'financeiro') setDashboardLens('financeiro');
      if (role === 'secretaria') setDashboardLens('secretaria');
    } catch {
      navigate('/login');
      return;
    }

    loadData();
  }, [navigate]);

  const visibleStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((item) =>
      String(item.nome || '').toLowerCase().includes(q)
      || String(item.email || '').toLowerCase().includes(q)
      || String(item.schoolName || '').toLowerCase().includes(q)
      || String(item.roleLabel || '').toLowerCase().includes(q)
    );
  }, [staffSearch, staff]);

  const cards: EnterpriseCard[] = [
    { title: 'Escolas ativas', value: String(stats.schools), subtitle: 'Instituições geridas no sistema', accent: 'from-blue-600 to-cyan-600', icon: <Building2 className="w-6 h-6" /> },
    { title: 'Equipa escolar', value: String(stats.staff), subtitle: 'Diretores, professores e seguranças', accent: 'from-emerald-600 to-green-600', icon: <Users className="w-6 h-6" /> },
    { title: 'Diretores', value: String(stats.directors), subtitle: 'Gestão académica e operacional', accent: 'from-indigo-600 to-violet-600', icon: <GraduationCap className="w-6 h-6" /> },
    { title: 'Professores', value: String(stats.teachers), subtitle: 'Docência e acompanhamento de turmas', accent: 'from-amber-500 to-orange-500', icon: <ClipboardList className="w-6 h-6" /> },
    { title: 'Seguranças', value: String(stats.security), subtitle: 'Controlo de entradas e QR', accent: 'from-red-500 to-rose-600', icon: <ShieldCheck className="w-6 h-6" /> },
    { title: 'Encarregados', value: String(stats.parents), subtitle: 'Famílias ligadas ao ecossistema', accent: 'from-sky-600 to-blue-700', icon: <Bell className="w-6 h-6" /> },
  ];

  const audienceTags = ['Diretores', 'Administradores', 'Secretarias', 'Coordenadores', 'Professores', 'Financeiro', 'RH'];

  const quickActions = [
    {
      title: 'Gerir Cursos',
      description: 'Abrir CRUD curricular completo de cursos, disciplinas e turmas.',
      icon: <GraduationCap className="w-5 h-5" />,
      action: () => navigate('/sistema/admin/edumarket'),
    },
    {
      title: 'Criar Curso',
      description: 'Abrir formulário de criação de curso.',
      icon: <BookOpen className="w-5 h-5" />,
      action: () => navigate('/edumarket/criar-curso'),
    },
    {
      title: 'Relatório de Professores',
      description: 'Admin filtrado para docentes por escola.',
      icon: <Users className="w-5 h-5" />,
      action: () => navigate('/admin?peopleProfile=teacher'),
    },
    {
      title: 'Relatório de Diretores',
      description: 'Admin filtrado para direção escolar.',
      icon: <Building2 className="w-5 h-5" />,
      action: () => navigate('/admin?peopleProfile=director'),
    },
  ];

  const pendingItems: PendingItem[] = useMemo(() => {
    const parentRequestsRaw = localStorage.getItem('eduguard_parent_student_requests');
    const parentRequests = parentRequestsRaw ? JSON.parse(parentRequestsRaw) : [];
    const pendingRequests = Array.isArray(parentRequests)
      ? parentRequests.filter((item: any) => String(item?.status || '').toLowerCase() === 'pending').length
      : 0;

    const teachersWithoutSchoolByRole = staff.filter((item: any) => item.roleKey === 'professor' && !item.escola_id).length;
    const pendingUsers = users.filter((item: any) => item?.status === 'pending' || item?.is_active === false).length;
    const studentsWithoutClass = students.filter((item: any) => !String(item?.classe || '').trim()).length;

    const workflowSummary = enterpriseOverview?.workflows?.summary || {};

    return [
      { id: 'enrollment', title: 'Matrículas por aprovar', owner: 'Secretaria', count: pendingRequests, tone: 'amber' },
      { id: 'teacher-schedule', title: 'Professores sem escola atribuída', owner: 'Direção', count: Math.max(teachersWithoutSchoolByRole, Number(workflowSummary.in_review || 0)), tone: 'sky' },
      { id: 'accounts', title: 'Contas pendentes/inativas', owner: 'Admin', count: Math.max(pendingUsers, Number(workflowSummary.pending || 0)), tone: 'rose' },
      { id: 'classroom', title: 'Alunos sem turma definida', owner: 'Gestão Académica', count: Math.max(studentsWithoutClass, Number(workflowSummary.approved || 0)), tone: 'emerald' },
    ];
  }, [users, staff, students, enterpriseOverview]);

  const pendingTotal = pendingItems.reduce((sum, item) => sum + item.count, 0);

  const globalSearchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];

    const studentRows = students
      .filter((student: any) => String(student?.nome || '').toLowerCase().includes(q) || String(student?.classe || '').toLowerCase().includes(q))
      .slice(0, 5)
      .map((student: any) => ({
        id: `student-${student.id}`,
        type: 'Aluno',
        title: student.nome || 'Aluno sem nome',
        subtitle: `${student.classe || 'Sem turma'} · ${schools.find((school: any) => String(school.id) === String(student.escola_id))?.nome || 'Sem escola'}`,
      }));

    const staffRows = staff
      .filter((person: any) => String(person?.nome || '').toLowerCase().includes(q) || String(person?.email || '').toLowerCase().includes(q))
      .slice(0, 5)
      .map((person: any) => ({
        id: `staff-${person.id}`,
        type: 'Colaborador',
        title: person.nome || 'Sem nome',
        subtitle: `${person.roleLabel} · ${person.schoolName || 'Sem escola'}`,
      }));

    const schoolRows = schools
      .filter((school: any) => String(school?.nome || '').toLowerCase().includes(q) || String(school?.email || '').toLowerCase().includes(q))
      .slice(0, 4)
      .map((school: any) => ({
        id: `school-${school.id}`,
        type: 'Escola',
        title: school.nome || 'Sem nome',
        subtitle: `${school.email || 'Sem email'} · ${school.telefone || 'Sem telefone'}`,
      }));

    return [...studentRows, ...staffRows, ...schoolRows].slice(0, 12);
  }, [globalSearch, students, staff, schools]);

  const notifications = useMemo(() => {
    const auditToday = Number(enterpriseOverview?.audit?.totalToday || 0);
    const sessionsActive = Number(enterpriseOverview?.sessions?.active || 0);
    const items = [
      { id: 'notif-1', text: `${pendingTotal} pendência(s) operacional(is) no sistema.`, tone: pendingTotal > 0 ? 'amber' : 'emerald' },
      { id: 'notif-2', text: `${stats.pendingUsers} conta(s) com necessidade de validação/reativação.`, tone: stats.pendingUsers > 0 ? 'rose' : 'emerald' },
      { id: 'notif-3', text: `${sessionsActive || Math.max(1, stats.staff)} sessão(ões) ativa(s) monitorizada(s).`, tone: 'sky' },
      { id: 'notif-4', text: `${auditToday || 0} evento(s) de auditoria registado(s) hoje.`, tone: 'emerald' },
    ];
    return items;
  }, [pendingTotal, stats, enterpriseOverview]);

  const agendaItems = [
    { id: 'a1', date: '12 Set', title: 'Conselho pedagógico', module: 'Direção', status: 'Confirmado' },
    { id: 'a2', date: '16 Set', title: 'Fecho de avaliações trimestrais', module: 'Académico', status: 'Em progresso' },
    { id: 'a3', date: '20 Set', title: 'Prazo de propinas', module: 'Financeiro', status: 'Crítico' },
    { id: 'a4', date: '25 Set', title: 'Reunião com encarregados', module: 'Comunicação', status: 'Planeado' },
  ];

  const workflowSteps = useMemo(() => {
    const summary = enterpriseOverview?.workflows?.summary || {};
    return [
      { id: 'wf-1', label: 'Pedido', count: Math.max(pendingItems[0]?.count || 0, Number(summary.pending || 0)) },
      { id: 'wf-2', label: 'Secretaria', count: Math.max(1, Number(summary.in_review || Math.round((pendingItems[0]?.count || 0) * 0.6))) },
      { id: 'wf-3', label: 'Direção', count: Math.max(1, Number(summary.approved || Math.round((pendingItems[2]?.count || 0) * 0.4))) },
      { id: 'wf-4', label: 'Financeiro', count: Math.max(1, Number(summary.rejected || Math.round((pendingItems[1]?.count || 0) * 0.5))) },
      { id: 'wf-5', label: 'Concluído', count: Math.max(1, Number(summary.completed || stats.schools)) },
    ];
  }, [enterpriseOverview, pendingItems, stats.schools]);

  const timelineEvents: TimelineEvent[] = useMemo(() => {
    const backendTimeline = enterpriseOverview?.audit?.latest;
    if (Array.isArray(backendTimeline) && backendTimeline.length > 0) {
      return backendTimeline.slice(0, 6).map((item: any, index: number) => {
        const date = item?.createdAt ? new Date(item.createdAt) : new Date();
        const action = String(item?.action || 'evento').replaceAll('_', ' ');
        return {
          id: `backend-${item.id || index}`,
          at: date.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' }),
          label: action.charAt(0).toUpperCase() + action.slice(1),
          detail: `${item?.resourceType || 'recurso'}${item?.actorName ? ` · por ${item.actorName}` : ''}`,
          tone: item?.severity === 'warn' ? 'amber' : item?.severity === 'error' ? 'sky' : 'emerald',
        } as TimelineEvent;
      });
    }

    const now = new Date();
    const fmt = (minutesAgo: number) => {
      const d = new Date(now.getTime() - minutesAgo * 60 * 1000);
      return d.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
    };

    return [
      { id: 't1', at: fmt(8), label: 'Aluno registado em entrada', detail: 'Operação de portaria sincronizada', tone: 'emerald' },
      { id: 't2', at: fmt(15), label: 'Pagamento recebido', detail: 'Módulo financeiro confirmou propina', tone: 'sky' },
      { id: 't3', at: fmt(31), label: 'Professor associado a turma', detail: 'Gestão académica atualizada', tone: 'emerald' },
      { id: 't4', at: fmt(46), label: 'Documento emitido', detail: 'Declaração assinada digitalmente', tone: 'amber' },
      { id: 't5', at: fmt(62), label: 'Nova turma criada', detail: 'Estrutura letiva expandida', tone: 'sky' },
    ];
  }, [stats.schools, enterpriseOverview]);

  const lensWidgets = {
    director: [
      { title: 'Receitas monitorizadas', value: `${Math.max(0, stats.schools * 125)}k MZN`, hint: 'Visão macro financeira' },
      { title: 'Evasão estimada', value: `${Math.min(100, Math.max(1, pendingItems[3]?.count || 1))}%`, hint: 'Baseado em pendências escolares' },
      { title: 'Crescimento operacional', value: `${Math.max(1, stats.schools)} novas frentes`, hint: 'Abertura de turmas e cursos' },
    ],
    teacher: [
      { title: 'Turmas em foco', value: `${Math.max(1, Math.round(stats.teachers / 2))}`, hint: 'Carga letiva ativa' },
      { title: 'Avaliações pendentes', value: `${pendingItems[0]?.count || 0}`, hint: 'Solicitações académicas abertas' },
      { title: 'Presenças críticas', value: `${pendingItems[3]?.count || 0}`, hint: 'Alunos sem turma definida' },
    ],
    secretaria: [
      { title: 'Matrículas para validar', value: `${pendingItems[0]?.count || 0}`, hint: 'Centro de pendências' },
      { title: 'Documentos pendentes', value: `${Math.max(0, pendingItems[2]?.count || 0)}`, hint: 'Fluxo administrativo' },
      { title: 'Atendimentos hoje', value: `${Math.max(6, stats.parents)}`, hint: 'Movimento de encarregados' },
    ],
    financeiro: [
      { title: 'Pagamentos em curso', value: `${Math.max(2, stats.schools)}`, hint: 'Conciliação operacional' },
      { title: 'Dívidas a contactar', value: `${Math.max(1, pendingItems[1]?.count || 1)}`, hint: 'Cobrança orientada' },
      { title: 'Fluxo previsto', value: `${Math.max(0, stats.schools * 32)}k MZN`, hint: 'Projeção mensal inicial' },
    ],
  };

  const securityHighlights = useMemo(() => {
    const mfa = enterpriseOverview?.security?.mfa || {};
    const policies = Array.isArray(enterpriseOverview?.security?.policies) ? enterpriseOverview.security.policies : [];
    const sessionsActive = Number(enterpriseOverview?.sessions?.active || 0);
    const auditToday = Number(enterpriseOverview?.audit?.totalToday || 0);

    return [
      { label: 'Auditoria ativa', value: `${auditToday} evento(s) registado(s) hoje no backend enterprise` },
      { label: 'Sessões monitorizadas', value: `${sessionsActive || Math.max(1, staff.length)} sessão(ões) institucional(is) ativa(s)` },
      { label: 'MFA e políticas', value: `${Number(mfa.verified || 0)} MFA verificado(s) · ${policies.length} política(s) de segurança` },
    ];
  }, [enterpriseOverview, staff.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold">EduGuard Enterprise</h1>
            <p className="text-sm text-slate-300">Operação institucional, processos e execução</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </button>
            <button onClick={() => navigate('/portais')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
              Portais <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Enterprise online</p>
              <h2 className="text-2xl font-bold md:text-3xl">ERP escolar orientado à ação e decisão operacional</h2>
              <p className="leading-relaxed text-slate-300">
                O foco deste painel é executar processos com rapidez: pesquisa global, pendências, workflow, agenda e monitorização em tempo real das equipas.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 md:min-w-[280px]">
              {audienceTags.map((tag) => (
                <span key={tag} className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-center text-sm text-slate-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <div key={card.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/10">
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent}`}>
                {card.icon}
              </div>
              <p className="text-sm text-slate-300">{card.title}</p>
              <p className="text-4xl font-black tracking-tight">{card.value}</p>
              <p className="mt-2 text-sm text-slate-400">{card.subtitle}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Pesquisa global</h2>
                <p className="text-sm text-slate-300">Procure aluno, turma, colaborador ou escola em um só campo.</p>
              </div>
              <button onClick={() => navigate('/admin')} className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">Abrir detalhe</button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                placeholder="Ex: Maria João, Turma 10A, Matemática"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3 pl-10 pr-4 text-white outline-none"
              />
            </div>
            <div className="mt-4 space-y-3">
              {globalSearch.trim().length === 0 ? (
                <p className="text-sm text-slate-400">Introduza um termo para pesquisar dados institucionais.</p>
              ) : globalSearchResults.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum resultado para o termo pesquisado.</p>
              ) : (
                globalSearchResults.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{item.title}</p>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-200">{item.type}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{item.subtitle}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Centro de notificações</h2>
                <p className="text-sm text-slate-300">Alertas institucionais no topo da operação.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">{notifications.length}</span>
            </div>
            <div className="space-y-3">
              {notifications.map((item) => (
                <div key={item.id} className={`rounded-2xl border p-3 text-sm ${toneClass[item.tone as keyof typeof toneClass]}`}>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Centro de pendências</h2>
                <p className="text-sm text-slate-300">Existem {pendingTotal} tarefa(s) pendente(s) para decisão.</p>
              </div>
              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-200">Prioridade alta</span>
            </div>
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div key={item.id} className={`rounded-2xl border p-4 ${toneClass[item.tone]}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{item.title}</p>
                    <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{item.count}</span>
                  </div>
                  <p className="mt-1 text-xs opacity-80">Responsável: {item.owner}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Workflow visual</h2>
                <p className="text-sm text-slate-300">Estado dos processos administrativos em cadeia.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">Fluxo institucional</span>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="relative rounded-2xl border border-white/10 bg-slate-950/50 p-3 text-center">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{step.label}</p>
                  <p className="mt-1 text-xl font-bold text-white">{step.count}</p>
                  {index < workflowSteps.length - 1 && (
                    <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-slate-500 md:block">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Agenda institucional</h2>
                <p className="text-sm text-slate-300">Exames, reuniões, eventos e prazos centralizados.</p>
              </div>
              <CalendarDays className="h-5 w-5 text-slate-300" />
            </div>
            <div className="space-y-3">
              {agendaItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{item.title}</p>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{item.date}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{item.module} · {item.status}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Timeline institucional</h2>
                <p className="text-sm text-slate-300">Sequência operacional de eventos da escola.</p>
              </div>
              <Clock3 className="h-5 w-5 text-slate-300" />
            </div>
            <div className="space-y-3">
              {timelineEvents.map((item) => (
                <div key={item.id} className={`rounded-2xl border p-4 ${toneClass[item.tone]}`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{item.label}</p>
                    <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">{item.at}</span>
                  </div>
                  <p className="mt-1 text-sm opacity-90">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Dashboard por perfil</h2>
              <p className="text-sm text-slate-300">Altere a lente e veja os widgets mais relevantes para cada função.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setDashboardLens('director')} className={`rounded-xl px-3 py-2 text-sm ${dashboardLens === 'director' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 hover:bg-white/15'}`}>Diretor</button>
              <button onClick={() => setDashboardLens('teacher')} className={`rounded-xl px-3 py-2 text-sm ${dashboardLens === 'teacher' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 hover:bg-white/15'}`}>Professor</button>
              <button onClick={() => setDashboardLens('secretaria')} className={`rounded-xl px-3 py-2 text-sm ${dashboardLens === 'secretaria' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 hover:bg-white/15'}`}>Secretaria</button>
              <button onClick={() => setDashboardLens('financeiro')} className={`rounded-xl px-3 py-2 text-sm ${dashboardLens === 'financeiro' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 hover:bg-white/15'}`}>Financeiro</button>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {lensWidgets[dashboardLens].map((widget) => (
              <div key={widget.title} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-sm text-slate-400">{widget.title}</p>
                <p className="mt-2 text-2xl font-bold text-white">{widget.value}</p>
                <p className="mt-1 text-xs text-slate-400">{widget.hint}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Ações rápidas</h2>
              <p className="text-sm text-slate-300">Execução imediata das tarefas mais frequentes.</p>
            </div>
            <button onClick={() => navigate('/admin')} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">
              Abrir Admin <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={item.action}
                className="group rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-left transition hover:border-emerald-400/40 hover:bg-slate-950"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-emerald-300 group-hover:text-emerald-200">Abrir fluxo</p>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Equipa registada</h2>
                <p className="text-sm text-slate-300">Consulta rápida por nome, escola, email ou perfil.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{visibleStaff.length} resultado(s)</span>
            </div>

            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={staffSearch}
                onChange={(event) => setStaffSearch(event.target.value)}
                placeholder="Pesquisar equipa"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3 pl-10 pr-4 text-white outline-none"
              />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {visibleStaff.length === 0 ? (
                <p className="text-slate-400">Nenhum registo encontrado.</p>
              ) : (
                visibleStaff.slice(0, 8).map((person) => (
                  <div key={`${person.id}-${person.email}`} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{person.nome}</p>
                        <p className="text-sm text-slate-400">{person.email || 'Sem email'}</p>
                      </div>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-200">{person.roleLabel}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">Escola: {person.schoolName}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Segurança e auditoria</h2>
                <p className="text-sm text-slate-300">Transparência de acesso e governação institucional.</p>
              </div>
              <ShieldAlert className="h-5 w-5 text-rose-300" />
            </div>
            <div className="space-y-3">
              {securityHighlights.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-300">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <button onClick={() => navigate('/admin')} className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">Auditoria de utilizadores</button>
              <button onClick={() => navigate('/sistema')} className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">Políticas de acesso</button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Arquitetura de módulos</h2>
              <p className="text-sm text-slate-300">Estrutura operacional consolidada por domínio.</p>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">8 módulos</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
              <CalendarDays className="mb-3 h-5 w-5 text-emerald-300" />
              <h3 className="font-semibold">Gestão Académica</h3>
              <p className="mt-1 text-sm text-slate-300">Cursos, disciplinas, turmas, calendário e matrículas.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
              <MessagesSquare className="mb-3 h-5 w-5 text-emerald-300" />
              <h3 className="font-semibold">Comunicação</h3>
              <p className="mt-1 text-sm text-slate-300">Mensagens, avisos, e-mails e portais de acompanhamento.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
              <WalletCards className="mb-3 h-5 w-5 text-emerald-300" />
              <h3 className="font-semibold">Financeiro</h3>
              <p className="mt-1 text-sm text-slate-300">Propinas, pagamentos, faturas e reconciliação.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
              <KeyRound className="mb-3 h-5 w-5 text-emerald-300" />
              <h3 className="font-semibold">Permissões e RH</h3>
              <p className="mt-1 text-sm text-slate-300">Perfis, segurança, auditoria e controlo de função.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
              <Layers3 className="mb-3 h-5 w-5 text-emerald-300" />
              <h3 className="font-semibold">Fluxos administrativos</h3>
              <p className="mt-1 text-sm text-slate-300">Aprovações, declarações e rastreabilidade por etapas.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
              <FileText className="mb-3 h-5 w-5 text-emerald-300" />
              <h3 className="font-semibold">Arquivo digital</h3>
              <p className="mt-1 text-sm text-slate-300">Documentos institucionais com consulta rápida.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
              <ShieldCheck className="mb-3 h-5 w-5 text-emerald-300" />
              <h3 className="font-semibold">Segurança operacional</h3>
              <p className="mt-1 text-sm text-slate-300">Controlo de entrada e conformidade de dados.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
              <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-300" />
              <h3 className="font-semibold">Execução orientada</h3>
              <p className="mt-1 text-sm text-slate-300">Centro de pendências, agenda e timeline no mesmo painel.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default EnterprisePortalPage;