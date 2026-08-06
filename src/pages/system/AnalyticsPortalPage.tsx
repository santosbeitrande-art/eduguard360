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
  const [metrics, setMetrics] = useState({
    schools: 0,
    students: 0,
    users: 0,
    entries: 0,
    alerts: 0,
  });
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);

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
      setRecentEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const trendData = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const entry of recentEntries) {
      const day = entry.data ? new Date(entry.data).toLocaleDateString('pt-MZ', { month: 'short', day: '2-digit' }) : 'N/A';
      byDay.set(day, (byDay.get(day) || 0) + 1);
    }
    return Array.from(byDay.entries()).slice(0, 6).map(([label, value]) => ({ label, value }));
  }, [recentEntries]);

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