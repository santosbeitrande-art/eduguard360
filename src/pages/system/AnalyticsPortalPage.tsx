import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { withTimeout } from '@/lib/networkPerformance';
import { normalizeEnterpriseRole } from '@/lib/enterpriseGovernance';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  Filter,
  Gauge,
  Goal,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';

type MetricCard = {
  key: 'schools' | 'students' | 'users' | 'entries' | 'alerts' | 'security';
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
  color: string;
};

type DrillRow = {
  id: string;
  label: string;
  value: number;
  subtitle: string;
};

type CustomKpi = {
  id: string;
  name: string;
  formula: 'attendance' | 'retention' | 'alerts';
};

const CUSTOM_KPI_KEY = 'eduguard_analytics_custom_kpis';

const AnalyticsPortalPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<'7d' | '30d' | '90d'>('30d');
  const [courseFilter, setCourseFilter] = useState('');
  const [drillSource, setDrillSource] = useState<'schools' | 'students' | 'users' | 'entries'>('students');
  const [customKpis, setCustomKpis] = useState<CustomKpi[]>([]);
  const [kpiForm, setKpiForm] = useState({ name: '', formula: 'attendance' as CustomKpi['formula'] });

  const [metrics, setMetrics] = useState({
    schools: 0,
    students: 0,
    users: 0,
    entries: 0,
    alerts: 0,
  });

  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [rankings, setRankings] = useState<{ courses: any[]; professors: any[] }>({ courses: [], professors: [] });
  const [accessContext, setAccessContext] = useState<any | null>(null);

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
    ...(localStorage.getItem('eduguard_token') || localStorage.getItem('token')
      ? { Authorization: `Bearer ${localStorage.getItem('eduguard_token') || localStorage.getItem('token')}` }
      : {}),
    'Content-Type': 'application/json',
    'x-enterprise-role': String(currentUser?.perfil || currentUser?.role || ''),
    'x-user-id': String(currentUser?.id || currentUser?.user_id || ''),
    'x-school-id': String(currentUser?.escola_id || currentUser?.school_id || currentUser?.tenant_id || ''),
    'x-tenant-id': String(currentUser?.tenant_id || currentUser?.escola_id || currentUser?.school_id || ''),
  });

  const resolveAccessContext = async (currentUser: any) => {
    const fallbackRole = normalizeEnterpriseRole(currentUser?.perfil || currentUser?.role);
    const fallbackSchool = String(currentUser?.escola_id || currentUser?.school_id || currentUser?.tenant_id || '').trim() || null;

    try {
      const headers = buildEnterpriseHeaders(currentUser);

      const analyticsResponse = await withTimeout(
        fetch('/api/v1/enterprise/analytics/overview', {
          method: 'GET',
          headers,
        }),
        10000,
        'Analytics enterprise overview timeout'
      );

      if (analyticsResponse.ok) {
        return await analyticsResponse.json();
      }

      const response = await withTimeout(
        fetch('/api/v1/enterprise/rbac/resolve', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            role: currentUser?.perfil || currentUser?.role,
            userId: currentUser?.id || currentUser?.user_id,
            schoolId: currentUser?.escola_id || currentUser?.school_id,
            tenantId: currentUser?.tenant_id,
          }),
        }),
        10000,
        'Analytics RBAC resolve timeout'
      );

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Use local fallback when backend RBAC endpoint is temporarily unavailable.
    }

    return {
      role: fallbackRole,
      permissions: {},
      analyticsScope: {
        level: fallbackRole === 'super_admin' ? 'global' : 'school',
        canViewAllSchools: fallbackRole === 'super_admin',
        schoolId: fallbackRole === 'super_admin' ? null : fallbackSchool,
        modules: ['schools', 'students', 'users', 'entries', 'courses', 'analytics'],
      },
    };
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const currentUser = resolveCurrentUserSnapshot();
      const resolvedPayload = await resolveAccessContext(currentUser);
      const resolvedAccess = resolvedPayload?.accessProfile || resolvedPayload;
      setAccessContext({
        ...resolvedPayload,
        accessProfile: resolvedAccess,
      });

      const canReadDomain = (domain: string) => {
        const actions = resolvedAccess?.permissions?.[domain];
        if (!Array.isArray(actions)) return true;
        return actions.includes('read');
      };

      const scopeSchoolId = String(
        resolvedAccess?.analyticsScope?.schoolId ||
        resolvedPayload?.scope?.schoolId ||
        resolvedPayload?.scope?.tenantId ||
        ''
      ).trim() || null;
      const canViewAllSchools = Boolean(
        resolvedAccess?.analyticsScope?.canViewAllSchools ||
        resolvedPayload?.scope?.role === 'super_admin'
      );

      const backendMetrics = resolvedPayload?.metrics || {};
      const backendBreakdowns = resolvedPayload?.breakdowns || {};

      const schoolDistribution = canReadDomain('schools') && Array.isArray(backendBreakdowns?.schoolDistribution)
        ? backendBreakdowns.schoolDistribution
        : [];
      const roleDistribution = canReadDomain('users') && Array.isArray(backendBreakdowns?.userRoleDistribution)
        ? backendBreakdowns.userRoleDistribution
        : [];
      const trendByDay = (canReadDomain('attendance') || canReadDomain('analytics')) && Array.isArray(backendBreakdowns?.trendByDay)
        ? backendBreakdowns.trendByDay
        : [];

      const schoolsData = schoolDistribution.map((row: any) => ({
        id: String(row?.id || row?.name || 'Sem escopo'),
        nome: String(row?.name || row?.id || 'Sem escopo'),
        students: Number(row?.students || 0),
        users: Number(row?.users || 0),
        movements: Number(row?.movements || 0),
        frequency: Number(row?.frequency || 0),
      }));

      const usersData = roleDistribution.map((row: any) => ({
        id: `role-${String(row?.role || 'unknown')}`,
        nome: String(row?.role || 'unknown'),
        perfil: String(row?.role || 'unknown'),
        total: Number(row?.total || 0),
      }));

      const studentsData = schoolsData.map((school: any) => ({
        id: `students-${String(school.id)}`,
        nome: `Alunos ${String(school.nome)}`,
        classe: 'Distribuição institucional',
        escola_id: school.id,
        count: Number(school.students || 0),
      }));

      const entriesData = trendByDay.map((point: any) => ({
        id: `trend-${String(point?.day || '')}`,
        tipo: 'movimentos',
        data: point?.day,
        aluno_id: String(point?.scopeId || point?.schoolId || 'all'),
        schoolId: String(point?.scopeId || point?.schoolId || ''),
        count: Number(point?.total || 0),
      }));

      const alerts = Math.max(0, Number(backendMetrics?.usersTotal || 0) - Number(backendMetrics?.usersActive || 0));

      const headers = buildEnterpriseHeaders(currentUser);
      let rankingsPayload: { courses?: any[]; professors?: any[] } = {};
      try {
        const rankingResponse = await withTimeout(
          fetch('/api/v1/enterprise/analytics/rankings', { headers }),
          10000,
          'Analytics rankings timeout'
        );
        if (rankingResponse.ok) {
          rankingsPayload = await rankingResponse.json();
        }
      } catch {
        rankingsPayload = {};
      }

      setSchools(schoolsData);
      setStudents(studentsData);
      setUsers(usersData);
      setMetrics({
        schools: typeof resolvedPayload?.metrics?.schoolsTotal === 'number'
          ? resolvedPayload.metrics.schoolsTotal
          : schoolsData.length,
        students: typeof resolvedPayload?.metrics?.studentsTotal === 'number'
          ? resolvedPayload.metrics.studentsTotal
          : studentsData.reduce((sum: number, item: any) => sum + Number(item?.count || 0), 0),
        users: typeof resolvedPayload?.metrics?.usersTotal === 'number'
          ? resolvedPayload.metrics.usersTotal
          : usersData.reduce((sum: number, item: any) => sum + Number(item?.total || 0), 0),
        entries: typeof resolvedPayload?.metrics?.reservationsTotal === 'number'
          ? resolvedPayload.metrics.reservationsTotal
          : entriesData.reduce((sum: number, item: any) => sum + Number(item?.count || 0), 0),
        alerts,
      });
      setRecentEntries(entriesData);
      setRankings({
        courses: Array.isArray(rankingsPayload?.courses) ? rankingsPayload.courses : [],
        professors: Array.isArray(rankingsPayload?.professors) ? rankingsPayload.professors : [],
      });

      if (!canViewAllSchools && scopeSchoolId) {
        setSchoolFilter(scopeSchoolId);
      }

    } catch (err: any) {
      console.error('Erro ao carregar Analytics Portal:', err);
      setError('Não foi possível carregar métricas em tempo real no backend.');

      setSchools([]);
      setUsers([]);
      setStudents([]);
      setRecentEntries([]);
      setRankings({ courses: [], professors: [] });
      setMetrics({
        schools: 0,
        students: 0,
        users: 0,
        entries: 0,
        alerts: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_KPI_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setCustomKpis(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCustomKpis([]);
    }
  }, []);

  const daysInPeriod = periodFilter === '7d' ? 7 : periodFilter === '90d' ? 90 : 30;

  const getWindowEntries = (days: number, offsetDays = 0) => {
    const end = Date.now() - offsetDays * 24 * 60 * 60 * 1000;
    const start = end - days * 24 * 60 * 60 * 1000;

    return recentEntries.filter((entry) => {
      const entryDate = entry.data ? new Date(entry.data).getTime() : 0;
      if (entryDate < start || entryDate > end) return false;
      if (schoolFilter !== 'all') {
        const entrySchool = String(entry?.schoolId || entry?.aluno_id || '').trim();
        if (entrySchool !== schoolFilter) return false;
      }
      return true;
    });
  };

  const filteredEntries = useMemo(() => getWindowEntries(daysInPeriod, 0), [recentEntries, periodFilter, schoolFilter, students]);
  const previousPeriodEntries = useMemo(() => getWindowEntries(daysInPeriod, daysInPeriod), [recentEntries, periodFilter, schoolFilter, students]);

  const schoolOptions = useMemo(() => schools.map((school) => ({ id: String(school.id), nome: school.nome })), [schools]);

  const filteredCourses = useMemo(() => {
    const query = courseFilter.trim().toLowerCase();
    if (!query) return rankings.courses;
    return rankings.courses.filter((course) => {
      const haystack = [course.label, course.subtitle]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [rankings.courses, courseFilter]);

  const inactiveUsers = metrics.alerts;
  const windowMovements = filteredEntries.reduce((sum, entry) => sum + Number(entry?.count || 0), 0);
  const activeStudents = metrics.students > 0 ? Math.min(metrics.students, windowMovements) : 0;
  const attendanceCoverage = metrics.students > 0 ? Math.round((activeStudents / metrics.students) * 100) : 0;
  const retention = metrics.users > 0 ? Math.max(0, 100 - Math.round((inactiveUsers / metrics.users) * 100)) : 0;

  const kpis = {
    approvalRate: `${Math.max(0, 100 - inactiveUsers)}%`,
    abandonmentRate: `${Math.min(100, Math.round((inactiveUsers / Math.max(metrics.users, 1)) * 100))}%`,
    averageFrequency: `${attendanceCoverage}%`,
    retention: `${retention}%`,
  };

  const trendData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const entry of filteredEntries) {
      const day = entry.data ? new Date(entry.data).toLocaleDateString('pt-MZ', { month: 'short', day: '2-digit' }) : 'N/A';
      byDay.set(day, (byDay.get(day) || 0) + Number(entry?.count || 0));
    }
    return Array.from(byDay.entries()).slice(0, 8).map(([label, value]) => ({ label, value }));
  }, [filteredEntries]);

  const previousTrendData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const entry of previousPeriodEntries) {
      const day = entry.data ? new Date(entry.data).toLocaleDateString('pt-MZ', { month: 'short', day: '2-digit' }) : 'N/A';
      byDay.set(day, (byDay.get(day) || 0) + Number(entry?.count || 0));
    }
    return Array.from(byDay.values());
  }, [previousPeriodEntries]);

  const entriesCurrent = filteredEntries.reduce((sum, entry) => sum + Number(entry?.count || 0), 0);
  const entriesPrevious = previousPeriodEntries.reduce((sum, entry) => sum + Number(entry?.count || 0), 0);
  const entriesDeltaPct = entriesPrevious > 0 ? Math.round(((entriesCurrent - entriesPrevious) / entriesPrevious) * 100) : 0;

  const currentActiveStudents = activeStudents;
  const previousActiveStudents = metrics.students > 0 ? Math.min(metrics.students, entriesPrevious) : 0;
  const studentsDeltaPct = previousActiveStudents > 0 ? Math.round(((currentActiveStudents - previousActiveStudents) / previousActiveStudents) * 100) : 0;

  const schoolBenchmarks = useMemo(() => {
    return schools.map((school: any) => {
      const schoolStudents = Number(school?.students || 0);
      const schoolEntries = Number(school?.movements || 0);
      return {
        id: school.id,
        name: school.nome,
        students: schoolStudents,
        movements: schoolEntries,
        frequency: schoolStudents > 0 ? Number(school?.frequency || Math.round((Math.min(schoolEntries, schoolStudents) / schoolStudents) * 100)) : 0,
      };
    }).sort((a, b) => b.movements - a.movements);
  }, [schools]);

  const ranking = useMemo(() => {
    const topSchools = schoolBenchmarks.slice(0, 5);
    const topCourses = [...filteredCourses]
      .sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0))
      .slice(0, 5)
      .map((course: any) => ({
        id: String(course?.id || ''),
        label: String(course?.label || 'Curso sem título'),
        score: Number(course?.score || 0),
        subtitle: String(course?.subtitle || ''),
      }));

    const teacherRank = (Array.isArray(rankings.professors) ? rankings.professors : [])
      .slice(0, 5)
      .map((user: any, index: number) => ({
        id: String(user?.id || index),
        label: String(user?.label || 'Professor sem nome'),
        score: Number(user?.score || 0),
        subtitle: String(user?.subtitle || 'Ranking backend'),
      }));

    return {
      schools: topSchools.map((item) => ({ id: String(item.id), label: item.name, score: item.frequency, subtitle: `${item.movements} movimentos` })),
      courses: topCourses,
      teachers: teacherRank,
    };
  }, [schoolBenchmarks, filteredCourses, rankings.professors]);

  const goalPanel = {
    attendanceGoal: 95,
    attendanceCurrent: attendanceCoverage,
    retentionGoal: 92,
    retentionCurrent: retention,
  };

  const prediction = useMemo(() => {
    if (trendData.length < 2) {
      return 'Sem dados suficientes para projeção robusta.';
    }

    const values = trendData.map((item) => item.value);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((sum, value) => sum + value, 0) / Math.max(firstHalf.length, 1);
    const secondAvg = secondHalf.reduce((sum, value) => sum + value, 0) / Math.max(secondHalf.length, 1);
    const direction = secondAvg >= firstAvg ? 'crescimento' : 'queda';

    if (direction === 'crescimento') {
      return `Se o ritmo atual continuar, a frequência tende a subir acima de ${Math.round(avg * 1.12)} movimentos/dia no próximo ciclo.`;
    }

    return `Se o ritmo atual continuar, a frequência pode descer para perto de ${Math.max(1, Math.round(avg * 0.88))} movimentos/dia no próximo ciclo.`;
  }, [trendData]);

  const drillData: DrillRow[] = useMemo(() => {
    if (drillSource === 'schools') {
      return schoolBenchmarks.slice(0, 12).map((item) => ({
        id: String(item.id),
        label: item.name,
        value: item.students,
        subtitle: `${item.frequency}% frequência · ${item.movements} movimentos`,
      }));
    }

    if (drillSource === 'students') {
      return schoolBenchmarks.slice(0, 12).map((item) => ({
        id: `students-${String(item.id)}`,
        label: item.name,
        value: item.students,
        subtitle: 'Distribuição de alunos por escola (backend)',
      }));
    }

    if (drillSource === 'users') {
      const roleCounter = new Map<string, number>();
      users.forEach((user: any) => {
        const role = String(user?.perfil || 'sem perfil').toLowerCase();
        roleCounter.set(role, (roleCounter.get(role) || 0) + 1);
      });
      return Array.from(roleCounter.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([label, value]) => ({
          id: label,
          label,
          value,
          subtitle: 'Distribuição por perfil',
        }));
    }

    const byType = new Map<string, number>();
    filteredEntries.forEach((entry) => {
      const type = String(entry?.tipo || 'desconhecido');
      byType.set(type, (byType.get(type) || 0) + Number(entry?.count || 1));
    });
    return Array.from(byType.entries()).map(([label, value]) => ({
      id: label,
      label,
      value,
      subtitle: 'Movimentos por tipo',
    }));
  }, [drillSource, schoolBenchmarks, students, users, filteredEntries]);

  const securityScore = Math.max(0, 100 - Math.min(100, metrics.alerts * 5));

  const metricCards: MetricCard[] = [
    { key: 'schools', title: 'Escolas', value: String(metrics.schools), hint: 'Unidades registadas', icon: <Building2 className="h-6 w-6" />, color: 'from-blue-600 to-cyan-600' },
    { key: 'students', title: 'Alunos', value: String(metrics.students), hint: 'Base de educandos', icon: <Users className="h-6 w-6" />, color: 'from-emerald-600 to-green-600' },
    { key: 'users', title: 'Utilizadores', value: String(metrics.users), hint: 'Contas totais', icon: <Activity className="h-6 w-6" />, color: 'from-violet-600 to-fuchsia-600' },
    { key: 'entries', title: 'Movimentos', value: String(metrics.entries), hint: 'Entradas recentes', icon: <BarChart3 className="h-6 w-6" />, color: 'from-orange-500 to-red-600' },
    { key: 'alerts', title: 'Alertas', value: String(metrics.alerts), hint: 'Pendências e contas inativas', icon: <Bell className="h-6 w-6" />, color: 'from-amber-500 to-yellow-600' },
    { key: 'security', title: 'Segurança Operacional', value: `${securityScore}%`, hint: 'Pontuação operacional estimada', icon: <ShieldCheck className="h-6 w-6" />, color: 'from-sky-600 to-blue-700' },
  ];

  const saveCustomKpi = () => {
    if (!kpiForm.name.trim()) return;
    const next = [
      ...customKpis,
      {
        id: `kpi-${Date.now()}`,
        name: kpiForm.name.trim(),
        formula: kpiForm.formula,
      },
    ];
    setCustomKpis(next);
    localStorage.setItem(CUSTOM_KPI_KEY, JSON.stringify(next));
    setKpiForm({ name: '', formula: 'attendance' });
  };

  const removeCustomKpi = (kpiId: string) => {
    const next = customKpis.filter((item) => item.id !== kpiId);
    setCustomKpis(next);
    localStorage.setItem(CUSTOM_KPI_KEY, JSON.stringify(next));
  };

  const customKpiValue = (formula: CustomKpi['formula']) => {
    if (formula === 'attendance') return `${attendanceCoverage}%`;
    if (formula === 'retention') return `${retention}%`;
    return `${metrics.alerts}`;
  };

  const arrowForDelta = (delta: number) => (
    delta >= 0
      ? <span className="inline-flex items-center gap-1 text-emerald-300"><ArrowUpRight className="h-4 w-4" /> +{delta}%</span>
      : <span className="inline-flex items-center gap-1 text-rose-300"><ArrowDownRight className="h-4 w-4" /> {delta}%</span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold">EduGuard Analytics</h1>
            <p className="text-sm text-slate-300">Decisão orientada por dados, tendência e metas</p>
            {accessContext && (
              <p className="text-xs text-slate-400 mt-1">
                Escopo: {String(accessContext?.analyticsScope?.level || 'global')} · Perfil: {String(accessContext?.role || 'unknown')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </button>
            <button onClick={() => navigate('/portais')} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
              Portais <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        {error && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Período</label>
              <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as '7d' | '30d' | '90d')} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="90d">Últimos 90 dias</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Escola</label>
              <select value={schoolFilter} onChange={(event) => setSchoolFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                <option value="all">Todas as escolas</option>
                {schoolOptions.map((school) => (
                  <option key={school.id} value={school.id}>{school.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Curso/disciplina</label>
              <input value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" placeholder="Filtrar cursos" />
            </div>
            <div className="flex items-end">
              <button onClick={loadData} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15">
                <Filter className="h-4 w-4" /> Recarregar BI
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((card) => (
            <button
              key={card.key}
              onClick={() => {
                if (card.key === 'schools') setDrillSource('schools');
                if (card.key === 'students') setDrillSource('students');
                if (card.key === 'users') setDrillSource('users');
                if (card.key === 'entries') setDrillSource('entries');
              }}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left shadow-2xl shadow-black/10 transition hover:border-sky-400/40"
              type="button"
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.color}`}>
                {card.icon}
              </div>
              <p className="text-sm text-slate-300">{card.title}</p>
              <p className="text-4xl font-black tracking-tight">{card.value}</p>
              <p className="mt-2 text-sm text-slate-400">{card.hint}</p>
            </button>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Comparação temporal</h2>
            <p className="text-sm text-slate-300">Atual vs período anterior com mesma duração.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-sm text-slate-400">Movimentos</p>
                <p className="mt-1 text-2xl font-bold">{entriesCurrent}</p>
                <div className="mt-2 text-sm">{arrowForDelta(entriesDeltaPct)}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-sm text-slate-400">Alunos ativos</p>
                <p className="mt-1 text-2xl font-bold">{currentActiveStudents}</p>
                <div className="mt-2 text-sm">{arrowForDelta(studentsDeltaPct)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Metas</h2>
            <p className="text-sm text-slate-300">Acompanhamento de objetivos da direção.</p>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-300">Meta de frequência</p>
                  <Goal className="h-4 w-4 text-emerald-300" />
                </div>
                <p className="mt-1 text-xl font-bold">{goalPanel.attendanceCurrent}% / {goalPanel.attendanceGoal}%</p>
                <p className="mt-1 text-xs text-slate-400">Faltam {Math.max(0, goalPanel.attendanceGoal - goalPanel.attendanceCurrent)} pontos percentuais.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-300">Meta de retenção</p>
                  <Gauge className="h-4 w-4 text-sky-300" />
                </div>
                <p className="mt-1 text-xl font-bold">{goalPanel.retentionCurrent}% / {goalPanel.retentionGoal}%</p>
                <p className="mt-1 text-xs text-slate-400">Faltam {Math.max(0, goalPanel.retentionGoal - goalPanel.retentionCurrent)} pontos percentuais.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Drill-down</h2>
                <p className="text-sm text-slate-300">Clique nos indicadores e aprofunde sem sair do Analytics.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">Fonte: {drillSource}</span>
            </div>
            <div className="mt-6 space-y-3 max-h-[23rem] overflow-auto pr-1">
              {drillData.length === 0 ? (
                <p className="text-slate-400">Sem dados para drill-down neste recorte.</p>
              ) : (
                drillData.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{row.label}</p>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{row.value}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{row.subtitle}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Tendência e previsão</h2>
            <p className="text-sm text-slate-300">Leitura preditiva simples com base no ritmo atual.</p>
            <div className="mt-6 space-y-3">
              {loading ? (
                <p className="text-slate-300">A carregar tendências...</p>
              ) : trendData.length === 0 ? (
                <p className="text-slate-400">Sem dados suficientes para tendência.</p>
              ) : (
                trendData.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-slate-400">{item.label}</div>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-3 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" style={{ width: `${Math.max(8, Math.min(100, item.value * 12))}%` }} />
                    </div>
                    <div className="w-10 text-right text-sm font-semibold">{item.value}</div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
              {prediction}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Ranking</h2>
            <p className="text-sm text-slate-300">Comparação de escolas, cursos e professores.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Escolas</p>
                {ranking.schools.slice(0, 4).map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                    <p className="text-sm font-semibold text-white">{index + 1}. {item.label}</p>
                    <p className="text-xs text-slate-400">{item.subtitle} · {item.score}%</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Cursos</p>
                {ranking.courses.slice(0, 4).map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                    <p className="text-sm font-semibold text-white">{index + 1}. {item.label}</p>
                    <p className="text-xs text-slate-400">{item.subtitle} · {item.score} inscrições</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Professores</p>
                {ranking.teachers.slice(0, 4).map((item, index) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                    <p className="text-sm font-semibold text-white">{index + 1}. {item.label}</p>
                    <p className="text-xs text-slate-400">{item.subtitle} · score {item.score}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">KPIs configuráveis</h2>
            <p className="text-sm text-slate-300">A administração institucional pode definir indicadores adicionais sem alterar código.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-[1.1fr_0.9fr_auto]">
              <input
                value={kpiForm.name}
                onChange={(event) => setKpiForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Nome do KPI"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none"
              />
              <select
                value={kpiForm.formula}
                onChange={(event) => setKpiForm((prev) => ({ ...prev, formula: event.target.value as CustomKpi['formula'] }))}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="attendance">Frequência</option>
                <option value="retention">Retenção</option>
                <option value="alerts">Alertas</option>
              </select>
              <button onClick={saveCustomKpi} className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">Adicionar</button>
            </div>

            <div className="mt-4 space-y-3">
              {customKpis.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum KPI personalizado criado.</p>
              ) : (
                customKpis.map((kpi) => (
                  <div key={kpi.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <div>
                      <p className="font-semibold text-white">{kpi.name}</p>
                      <p className="text-sm text-slate-400">Fórmula: {kpi.formula}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">{customKpiValue(kpi.formula)}</span>
                      <button onClick={() => removeCustomKpi(kpi.id)} className="rounded-lg bg-white/10 px-2 py-1 text-xs hover:bg-white/15">Remover</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">KPIs principais</h2>
              <p className="text-sm text-slate-300">Leitura executiva para decisão.</p>
            </div>
            <button onClick={() => navigate('/admin')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
              Abrir Gestão Institucional <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Taxa de aprovação', value: kpis.approvalRate },
              { label: 'Taxa de abandono', value: kpis.abandonmentRate },
              { label: 'Frequência média', value: kpis.averageFrequency },
              { label: 'Retenção de alunos', value: kpis.retention },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-sm text-slate-400">{item.label}</p>
                <p className="text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Relatórios e exportação</h2>
              <p className="text-sm text-slate-300">CSV/Excel/PDF e agendamento por e-mail prontos para ligação ao pipeline final.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">Exportar CSV</button>
              <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">Exportar Excel</button>
              <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">Gerar PDF</button>
              <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">Agendar por e-mail</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AnalyticsPortalPage;