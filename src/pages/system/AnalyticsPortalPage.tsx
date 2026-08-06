import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/networkPerformance';
import { Activity, ArrowRight, BarChart3, Bell, Building2, ShieldCheck, RefreshCw, Users } from 'lucide-react';

type MetricCard = {
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
  color: string;
};

const AnalyticsPortalPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<'7d' | '30d' | '90d'>('30d');
  const [courseFilter, setCourseFilter] = useState('all');
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

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [schoolsRes, studentsRes, usersRes, entriesRes] = await Promise.all([
        withTimeout(supabase.from('escolas').select('id,nome').order('nome'), 12000, 'Analytics schools timeout'),
        withTimeout(supabase.from('alunos').select('id,escola_id,encarregado_id').limit(5000), 12000, 'Analytics students timeout'),
        withTimeout(supabase.from('utilizadores').select('id,perfil,status,is_active,escola_id').limit(5000), 12000, 'Analytics users timeout'),
        withTimeout(supabase.from('entradas').select('id,tipo,data,aluno_id').order('data', { ascending: false }).limit(30), 12000, 'Analytics entries timeout'),
      ]);

      const schoolsData = Array.isArray(schoolsRes.data) ? schoolsRes.data : [];
      const studentsData = Array.isArray(studentsRes.data) ? studentsRes.data : [];
      const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
      const entriesData = Array.isArray(entriesRes.data) ? entriesRes.data : [];

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
    } catch (err: any) {
      console.error('Erro ao carregar Analytics Portal:', err);
      setError('Não foi possível carregar métricas em tempo real. A mostrar dados locais quando disponíveis.');
      const cachedSchoolsRaw = localStorage.getItem('eduguard_admin_schools_cache');
      const cachedUsersRaw = localStorage.getItem('eduguard_locally_approved_users');
      const cachedRequestsRaw = localStorage.getItem('eduguard_parent_student_requests');
      const cachedSchools = cachedSchoolsRaw ? JSON.parse(cachedSchoolsRaw) : [];
      const users = cachedUsersRaw ? JSON.parse(cachedUsersRaw) : [];
      const localEntries = cachedRequestsRaw ? JSON.parse(cachedRequestsRaw) : [];
      setMetrics({
        schools: Array.isArray(cachedSchools) ? cachedSchools.length : 0,
        students: Array.isArray(localEntries) ? localEntries.length : 0,
        users: Array.isArray(users) ? users.length : 0,
        entries: 0,
        alerts: Array.isArray(localEntries) ? localEntries.filter((item: any) => String(item?.status || '').toLowerCase() === 'pending').length : 0,
      });
      setUsers(Array.isArray(users) ? users : []);
      setRecentEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEntries = useMemo(() => {
    const days = periodFilter === '7d' ? 7 : periodFilter === '90d' ? 90 : 30;
    const minDate = Date.now() - days * 24 * 60 * 60 * 1000;
    return recentEntries.filter((entry) => {
      const entryDate = entry.data ? new Date(entry.data).getTime() : 0;
      if (entryDate < minDate) return false;
      if (schoolFilter !== 'all') {
        const studentSchool = students.find((student: any) => String(student.id) === String(entry.aluno_id))?.escola_id || null;
        if (String(studentSchool || '') !== schoolFilter) return false;
      }
      return true;
    });
  }, [recentEntries, periodFilter, schoolFilter, students]);

  const schoolOptions = useMemo(() => schools.map((school) => ({ id: String(school.id), nome: school.nome })), [schools]);

  const kpis = useMemo(() => {
    const totalStudents = students.length;
    const totalUsers = users.length;
    const totalEntries = filteredEntries.length;
    const activeStudents = new Set(filteredEntries.map((entry) => entry.aluno_id)).size;
    const attendanceCoverage = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;
    const inactiveUsers = users.filter((user: any) => user?.status === 'pending' || user?.is_active === false).length;
    const retention = totalUsers > 0 ? Math.max(0, 100 - Math.round((inactiveUsers / totalUsers) * 100)) : 0;

    return {
      approvalRate: `${Math.max(0, 100 - inactiveUsers)}%`,
      abandonmentRate: `${Math.min(100, Math.round((inactiveUsers / Math.max(totalUsers, 1)) * 100))}%`,
      averageFrequency: `${attendanceCoverage}%`,
      retention: `${retention}%`,
      entries: totalEntries,
    };
  }, [students, users, filteredEntries]);

  const trendData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const entry of filteredEntries) {
      const day = entry.data ? new Date(entry.data).toLocaleDateString('pt-MZ', { month: 'short', day: '2-digit' }) : 'N/A';
      byDay.set(day, (byDay.get(day) || 0) + 1);
    }
    return Array.from(byDay.entries()).slice(0, 6).map(([label, value]) => ({ label, value }));
  }, [filteredEntries]);

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

  const metricCards: MetricCard[] = [
    { title: 'Escolas', value: String(metrics.schools), hint: 'Unidades registadas', icon: <Building2 className="w-6 h-6" />, color: 'from-blue-600 to-cyan-600' },
    { title: 'Alunos', value: String(metrics.students), hint: 'Base de educandos', icon: <Users className="w-6 h-6" />, color: 'from-emerald-600 to-green-600' },
    { title: 'Utilizadores', value: String(metrics.users), hint: 'Contas totais', icon: <Activity className="w-6 h-6" />, color: 'from-violet-600 to-fuchsia-600' },
    { title: 'Movimentos', value: String(metrics.entries), hint: 'Entradas recentes', icon: <BarChart3 className="w-6 h-6" />, color: 'from-orange-500 to-red-600' },
    { title: 'Alertas', value: String(metrics.alerts), hint: 'Pendências e contas inativas', icon: <Bell className="w-6 h-6" />, color: 'from-amber-500 to-yellow-600' },
    { title: 'Segurança', value: `${Math.max(0, 100 - Math.min(100, metrics.alerts * 5))}%`, hint: 'Pontuação operacional estimada', icon: <ShieldCheck className="w-6 h-6" />, color: 'from-sky-600 to-blue-700' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">EduGuard Analytics</h1>
            <p className="text-sm text-slate-300">Métricas educacionais, operacionais e de segurança em tempo real</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </button>
            <button onClick={() => navigate('/portais')} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
              Portais <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
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
              <label className="mb-2 block text-sm text-slate-300">Curso / disciplina</label>
              <input value={courseFilter} onChange={(event) => setCourseFilter(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" placeholder="Todos os cursos" />
            </div>
            <div className="flex items-end">
              <button onClick={loadData} className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15">Recarregar BI</button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((card) => (
            <div key={card.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/10">
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.color}`}>
                {card.icon}
              </div>
              <p className="text-sm text-slate-300">{card.title}</p>
              <p className="text-4xl font-black tracking-tight">{card.value}</p>
              <p className="mt-2 text-sm text-slate-400">{card.hint}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Tendência de movimentos</h2>
                <p className="text-sm text-slate-300">Resumo dos registos recentes de entradas e saídas.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">Últimos 30 registos</span>
            </div>

            <div className="mt-6 space-y-3">
              {loading ? (
                <p className="text-slate-300">A carregar tendências...</p>
              ) : trendData.length === 0 ? (
                <p className="text-slate-400">Sem dados suficientes para tendência.</p>
              ) : (
                trendData.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-slate-400">{item.label}</div>
                    <div className="flex-1 rounded-full bg-white/10 h-3 overflow-hidden">
                      <div className="h-3 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" style={{ width: `${Math.max(8, Math.min(100, item.value * 18))}%` }} />
                    </div>
                    <div className="w-10 text-right text-sm font-semibold">{item.value}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold">Escolas monitorizadas</h2>
                <p className="text-sm text-slate-300">Lista operacional das escolas incluídas na análise.</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{schools.length}</span>
            </div>
            <div className="space-y-3 max-h-[28rem] overflow-auto pr-1">
              {schools.length === 0 ? (
                <p className="text-slate-400">Nenhuma escola encontrada.</p>
              ) : (
                schools.map((school) => (
                  <div key={school.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                    <p className="font-semibold">{school.nome}</p>
                    <p className="text-sm text-slate-400">{school.email || 'Sem email'} · {school.telefone || 'Sem telefone'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">KPIs principais</h2>
            <p className="text-sm text-slate-300">Leitura executiva para decisão.</p>
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
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Alertas inteligentes</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                {metrics.alerts > 0 ? `Existem ${metrics.alerts} alertas operacionais ativos.` : 'Nenhum alerta crítico identificado no momento.'}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
                {schoolFilter === 'all'
                  ? 'A análise está a cobrir toda a rede institucional.'
                  : `A análise está filtrada para a escola selecionada.`}
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
                {periodFilter === '7d'
                  ? 'Janela curta: ideal para monitorizar picos de frequência e movimentação.'
                  : periodFilter === '90d'
                    ? 'Janela longa: ideal para evolução trimestral e benchmark interno.'
                    : 'Janela mensal: equilíbrio entre operação e estratégia.'}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Relatórios e exportação</h2>
              <p className="text-sm text-slate-300">PDF, Excel e CSV podem ser ligados em seguida ao pipeline de dados real.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">Exportar CSV</button>
              <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">Exportar Excel</button>
              <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">Gerar PDF</button>
              <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">Agendar por e-mail</button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Benchmark interno</h2>
          <p className="text-sm text-slate-300">Comparação por escola baseada no tráfego operacional disponível.</p>
          <div className="mt-6 space-y-3">
            {schoolBenchmarks.length === 0 ? (
              <p className="text-slate-400">Sem dados para benchmark.</p>
            ) : (
              schoolBenchmarks.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-slate-400">{item.students} alunos · {item.movements} movimentos</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">Frequência {item.frequency}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-2 rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" style={{ width: `${Math.max(8, Math.min(100, item.frequency))}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Insights rápidos</h2>
              <p className="text-sm text-slate-300">Resumo operacional para direção e análise executiva.</p>
            </div>
            <button onClick={() => navigate('/admin')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
              Abrir Admin <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400">Crescimento de utilizadores</p>
              <p className="text-2xl font-bold">{metrics.users}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400">Participação escolar</p>
              <p className="text-2xl font-bold">{metrics.students > 0 && metrics.schools > 0 ? Math.round((metrics.students / Math.max(metrics.schools, 1))) : 0} alunos/escola</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400">Status operacional</p>
              <p className="text-2xl font-bold">{metrics.alerts > 0 ? 'Atenção' : 'Estável'}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AnalyticsPortalPage;