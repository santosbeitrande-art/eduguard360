import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
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
  const [courses, setCourses] = useState<any[]>([]);
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

  const resolveAccessContext = async (currentUser: any) => {
    const fallbackRole = normalizeEnterpriseRole(currentUser?.perfil || currentUser?.role);
    const fallbackSchool = String(currentUser?.escola_id || currentUser?.school_id || currentUser?.tenant_id || '').trim() || null;

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'x-enterprise-role': String(currentUser?.perfil || currentUser?.role || ''),
        'x-user-id': String(currentUser?.id || currentUser?.user_id || ''),
        'x-school-id': String(currentUser?.escola_id || currentUser?.school_id || currentUser?.tenant_id || ''),
        'x-tenant-id': String(currentUser?.tenant_id || currentUser?.escola_id || currentUser?.school_id || ''),
      };

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
      const resolvedAccess = await resolveAccessContext(currentUser);
      setAccessContext(resolvedAccess);

      const canReadDomain = (domain: string) => {
        const actions = resolvedAccess?.permissions?.[domain];
        if (!Array.isArray(actions)) return true;
        return actions.includes('read');
      };

      const scopeSchoolId = String(resolvedAccess?.analyticsScope?.schoolId || '').trim() || null;
      const canViewAllSchools = Boolean(resolvedAccess?.analyticsScope?.canViewAllSchools);

      let schoolsQuery = supabase.from('escolas').select('id,nome,email,telefone').order('nome');
      if (!canViewAllSchools && scopeSchoolId) {
        schoolsQuery = schoolsQuery.eq('id', scopeSchoolId);
      }

      let studentsQuery = supabase.from('alunos').select('id,nome,classe,escola_id,encarregado_id').limit(5000);
      if (!canViewAllSchools && scopeSchoolId) {
        studentsQuery = studentsQuery.eq('escola_id', scopeSchoolId);
      }

      let usersQuery = supabase.from('utilizadores').select('id,nome,perfil,status,is_active,escola_id').limit(5000);
      if (!canViewAllSchools && scopeSchoolId) {
        usersQuery = usersQuery.eq('escola_id', scopeSchoolId);
      }

      const [schoolsRes, studentsRes, usersRes, entriesRes] = await Promise.all([
        withTimeout(schoolsQuery, 12000, 'Analytics schools timeout'),
        withTimeout(studentsQuery, 12000, 'Analytics students timeout'),
        withTimeout(usersQuery, 12000, 'Analytics users timeout'),
        withTimeout(supabase.from('entradas').select('id,tipo,data,aluno_id').order('data', { ascending: false }).limit(120), 12000, 'Analytics entries timeout'),
      ]);

      const schoolsData = canReadDomain('schools') && Array.isArray(schoolsRes.data) ? schoolsRes.data : [];
      const studentsData = canReadDomain('students') && Array.isArray(studentsRes.data) ? studentsRes.data : [];
      const usersData = canReadDomain('users') && Array.isArray(usersRes.data) ? usersRes.data : [];
      const rawEntries = Array.isArray(entriesRes.data) ? entriesRes.data : [];
      const allowedStudentIds = new Set(studentsData.map((student: any) => String(student.id)));
      const entriesData = (canReadDomain('attendance') || canReadDomain('analytics'))
        ? rawEntries.filter((entry: any) => allowedStudentIds.size === 0 || allowedStudentIds.has(String(entry.aluno_id)))
        : [];

      const alerts = usersData.filter((user: any) => user?.status === 'pending' || user?.is_active === false).length;

      setSchools(schoolsData);
      setStudents(studentsData);
      setUsers(usersData);
      setMetrics({
        schools: schoolsData.length,
        students: studentsData.length,
        users: usersData.length,
        entries: entriesData.length,
        alerts,
      });
      setRecentEntries(entriesData);

      if (!canViewAllSchools && scopeSchoolId) {
        setSchoolFilter(scopeSchoolId);
      }

      try {
        if (!canReadDomain('courses')) {
          setCourses([]);
        } else {
          const [publishedCoursesRes, draftCoursesRes] = await Promise.all([
            withTimeout(fetch('/api/courses?status=published'), 12000, 'Analytics published courses timeout'),
            withTimeout(fetch('/api/courses?status=draft'), 12000, 'Analytics draft courses timeout'),
          ]);

          const publishedCoursesData = publishedCoursesRes.ok ? await publishedCoursesRes.json() : { courses: [] };
          const draftCoursesData = draftCoursesRes.ok ? await draftCoursesRes.json() : { courses: [] };
          const publishedCourses = Array.isArray(publishedCoursesData.courses) ? publishedCoursesData.courses : [];
          const draftCourses = Array.isArray(draftCoursesData.courses) ? draftCoursesData.courses : [];

          const mergedCourses = [...publishedCourses];
          for (const course of draftCourses) {
            if (!mergedCourses.some((item: any) => String(item.id) === String(course.id))) {
              mergedCourses.push(course);
            }
          }
          setCourses(mergedCourses);
        }
      } catch (courseError) {
        console.warn('Analytics courses timeout or unavailable:', courseError);
        setCourses([]);
      }
    } catch (err: any) {
      console.error('Erro ao carregar Analytics Portal:', err);
      setError('Não foi possível carregar métricas em tempo real. A mostrar dados locais quando disponíveis.');
      const cachedSchoolsRaw = localStorage.getItem('eduguard_admin_schools_cache');
      const cachedUsersRaw = localStorage.getItem('eduguard_locally_approved_users');
      const cachedRequestsRaw = localStorage.getItem('eduguard_parent_student_requests');
      const cachedSchools = cachedSchoolsRaw ? JSON.parse(cachedSchoolsRaw) : [];
      const localUsers = cachedUsersRaw ? JSON.parse(cachedUsersRaw) : [];
      const localEntries = cachedRequestsRaw ? JSON.parse(cachedRequestsRaw) : [];

      setSchools(Array.isArray(cachedSchools) ? cachedSchools : []);
      setUsers(Array.isArray(localUsers) ? localUsers : []);
      setStudents([]);
      setRecentEntries([]);
      setCourses([]);
      setMetrics({
        schools: Array.isArray(cachedSchools) ? cachedSchools.length : 0,
        students: Array.isArray(localEntries) ? localEntries.length : 0,
        users: Array.isArray(localUsers) ? localUsers.length : 0,
        entries: 0,
        alerts: Array.isArray(localUsers)
          ? localUsers.filter((item: any) => String(item?.status || '').toLowerCase() === 'pending' || item?.is_active === false).length
          : 0,
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
        const studentSchool = students.find((student: any) => String(student.id) === String(entry.aluno_id))?.escola_id || null;
        if (String(studentSchool || '') !== schoolFilter) return false;
      }
      return true;
    });
  };

  const filteredEntries = useMemo(() => getWindowEntries(daysInPeriod, 0), [recentEntries, periodFilter, schoolFilter, students]);
  const previousPeriodEntries = useMemo(() => getWindowEntries(daysInPeriod, daysInPeriod), [recentEntries, periodFilter, schoolFilter, students]);

  const schoolOptions = useMemo(() => schools.map((school) => ({ id: String(school.id), nome: school.nome })), [schools]);

  const filteredCourses = useMemo(() => {
    const query = courseFilter.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter((course) => {
      const haystack = [course.title, course.description, course.status, course.instructorId, course.category]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [courses, courseFilter]);

  const inactiveUsers = users.filter((user: any) => user?.status === 'pending' || user?.is_active === false).length;
  const activeStudents = new Set(filteredEntries.map((entry) => entry.aluno_id)).size;
  const attendanceCoverage = students.length > 0 ? Math.round((activeStudents / students.length) * 100) : 0;
  const retention = users.length > 0 ? Math.max(0, 100 - Math.round((inactiveUsers / users.length) * 100)) : 0;

  const kpis = {
    approvalRate: `${Math.max(0, 100 - inactiveUsers)}%`,
    abandonmentRate: `${Math.min(100, Math.round((inactiveUsers / Math.max(users.length, 1)) * 100))}%`,
    averageFrequency: `${attendanceCoverage}%`,
    retention: `${retention}%`,
  };

  const trendData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const entry of filteredEntries) {
      const day = entry.data ? new Date(entry.data).toLocaleDateString('pt-MZ', { month: 'short', day: '2-digit' }) : 'N/A';
      byDay.set(day, (byDay.get(day) || 0) + 1);
    }
    return Array.from(byDay.entries()).slice(0, 8).map(([label, value]) => ({ label, value }));
  }, [filteredEntries]);

  const previousTrendData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const entry of previousPeriodEntries) {
      const day = entry.data ? new Date(entry.data).toLocaleDateString('pt-MZ', { month: 'short', day: '2-digit' }) : 'N/A';
      byDay.set(day, (byDay.get(day) || 0) + 1);
    }
    return Array.from(byDay.values());
  }, [previousPeriodEntries]);

  const entriesCurrent = filteredEntries.length;
  const entriesPrevious = previousPeriodEntries.length;
  const entriesDeltaPct = entriesPrevious > 0 ? Math.round(((entriesCurrent - entriesPrevious) / entriesPrevious) * 100) : 0;

  const currentActiveStudents = new Set(filteredEntries.map((entry) => entry.aluno_id)).size;
  const previousActiveStudents = new Set(previousPeriodEntries.map((entry) => entry.aluno_id)).size;
  const studentsDeltaPct = previousActiveStudents > 0 ? Math.round(((currentActiveStudents - previousActiveStudents) / previousActiveStudents) * 100) : 0;

  const schoolBenchmarks = useMemo(() => {
    return schools.map((school) => {
      const schoolStudents = students.filter((student: any) => String(student.escola_id || '') === String(school.id));
      const schoolEntries = filteredEntries.filter((entry) => schoolStudents.some((student: any) => String(student.id) === String(entry.aluno_id)));
      return {
        id: school.id,
        name: school.nome,
        students: schoolStudents.length,
        movements: schoolEntries.length,
        frequency: schoolStudents.length > 0 ? Math.round((new Set(schoolEntries.map((entry) => entry.aluno_id)).size / schoolStudents.length) * 100) : 0,
      };
    }).sort((a, b) => b.movements - a.movements);
  }, [schools, students, filteredEntries]);

  const ranking = useMemo(() => {
    const topSchools = schoolBenchmarks.slice(0, 5);
    const topCourses = [...filteredCourses]
      .sort((a, b) => {
        const aEnrollments = Array.isArray(a?.students) ? a.students.length : 0;
        const bEnrollments = Array.isArray(b?.students) ? b.students.length : 0;
        return bEnrollments - aEnrollments;
      })
      .slice(0, 5)
      .map((course) => ({
        id: String(course.id),
        label: course.title || 'Curso sem título',
        score: Array.isArray(course.students) ? course.students.length : 0,
        subtitle: `Status: ${String(course.status || 'draft')}`,
      }));

    const teacherRank = users
      .filter((user: any) => {
        const role = String(user?.perfil || '').toLowerCase();
        return role === 'teacher' || role === 'professor' || role === 'docente';
      })
      .slice(0, 5)
      .map((user: any, index: number) => ({
        id: String(user.id || index),
        label: user.nome || 'Professor sem nome',
        score: Math.max(1, 100 - index * 7),
        subtitle: user.escola_id ? `Escola ${String(user.escola_id).slice(0, 8)}` : 'Sem escola associada',
      }));

    return {
      schools: topSchools.map((item) => ({ id: String(item.id), label: item.name, score: item.frequency, subtitle: `${item.movements} movimentos` })),
      courses: topCourses,
      teachers: teacherRank,
    };
  }, [schoolBenchmarks, filteredCourses, users]);

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
      const classCounter = new Map<string, number>();
      students.forEach((student: any) => {
        const key = String(student?.classe || 'Sem turma');
        classCounter.set(key, (classCounter.get(key) || 0) + 1);
      });
      return Array.from(classCounter.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([label, value]) => ({
          id: label,
          label,
          value,
          subtitle: 'Distribuição por turma/classe',
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
      byType.set(type, (byType.get(type) || 0) + 1);
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