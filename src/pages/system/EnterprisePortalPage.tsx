import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/lib/networkPerformance';
import { Building2, Users, GraduationCap, ShieldCheck, Bell, ClipboardList, ArrowRight, Search, RefreshCw } from 'lucide-react';

type EnterpriseRole = 'director' | 'teacher' | 'security' | 'parent' | 'admin';

type EnterpriseCard = {
  title: string;
  value: string;
  subtitle: string;
  accent: string;
  icon: ReactNode;
};

const isRelevantRole = (perfil: unknown) => {
  const normalized = String(perfil || '').trim().toLowerCase();
  return normalized === 'director' || normalized === 'school_admin' || normalized === 'teacher' || normalized === 'professor' || normalized === 'scanner' || normalized === 'security' || normalized === 'admin';
};

const getRoleLabel = (perfil: unknown): EnterpriseRole | 'other' => {
  const normalized = String(perfil || '').trim().toLowerCase();
  if (normalized === 'director' || normalized === 'school_admin') return 'director';
  if (normalized === 'teacher' || normalized === 'professor' || normalized === 'docente') return 'teacher';
  if (normalized === 'scanner' || normalized === 'security' || normalized === 'seguranca') return 'security';
  if (normalized === 'admin') return 'admin';
  if (normalized === 'pai' || normalized === 'parent') return 'parent';
  return 'other';
};

const EnterprisePortalPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    schools: 0,
    staff: 0,
    directors: 0,
    teachers: 0,
    security: 0,
    parents: 0,
  });
  const [schools, setSchools] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schoolsRes, usersRes, studentsRes] = await Promise.all([
        withTimeout(supabase.from('escolas').select('id,nome,email,telefone,endereco').order('nome'), 12000, 'Enterprise schools timeout'),
        withTimeout(supabase.from('utilizadores').select('id,nome,email,telefone,perfil,escola_id,status,is_active').order('nome'), 12000, 'Enterprise users timeout'),
        withTimeout(supabase.from('alunos').select('id,encarregado_id,escola_id').limit(5000), 12000, 'Enterprise students timeout'),
      ]);

      const schoolsData = Array.isArray(schoolsRes.data) ? schoolsRes.data : [];
      const usersData = Array.isArray(usersRes.data) ? usersRes.data : [];
      const studentsData = Array.isArray(studentsRes.data) ? studentsRes.data : [];

      const staffData = usersData.filter((user: any) => isRelevantRole(user?.perfil)).map((user: any) => ({
        ...user,
        roleLabel: getRoleLabel(user?.perfil),
        schoolName: schoolsData.find((school: any) => String(school.id) === String(user.escola_id))?.nome || 'Sem escola associada',
      }));

      setSchools(schoolsData);
      setStaff(staffData);
      setStats({
        schools: schoolsData.length,
        staff: staffData.length,
        directors: staffData.filter((item: any) => item.roleLabel === 'director').length,
        teachers: staffData.filter((item: any) => item.roleLabel === 'teacher').length,
        security: staffData.filter((item: any) => item.roleLabel === 'security').length,
        parents: usersData.filter((item: any) => getRoleLabel(item?.perfil) === 'parent' || studentsData.some((student: any) => String(student.encarregado_id) === String(item.id))).length,
      });
    } catch (error) {
      console.error('Erro ao carregar Enterprise Portal:', error);
      const cached = localStorage.getItem('eduguard_admin_schools_cache');
      setSchools(cached ? JSON.parse(cached) : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const visibleStaff = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((item) =>
      String(item.nome || '').toLowerCase().includes(q) ||
      String(item.email || '').toLowerCase().includes(q) ||
      String(item.schoolName || '').toLowerCase().includes(q) ||
      String(item.roleLabel || '').toLowerCase().includes(q)
    );
  }, [searchTerm, staff]);

  const cards: EnterpriseCard[] = [
    { title: 'Escolas ativas', value: String(stats.schools), subtitle: 'Instituições geridas no sistema', accent: 'from-blue-600 to-cyan-600', icon: <Building2 className="w-6 h-6" /> },
    { title: 'Equipa escolar', value: String(stats.staff), subtitle: 'Diretores, professores e seguranças', accent: 'from-emerald-600 to-green-600', icon: <Users className="w-6 h-6" /> },
    { title: 'Diretores', value: String(stats.directors), subtitle: 'Gestão académica e operacional', accent: 'from-indigo-600 to-violet-600', icon: <GraduationCap className="w-6 h-6" /> },
    { title: 'Professores', value: String(stats.teachers), subtitle: 'Docência e acompanhamento de turmas', accent: 'from-amber-500 to-orange-500', icon: <ClipboardList className="w-6 h-6" /> },
    { title: 'Seguranças', value: String(stats.security), subtitle: 'Controlo de entradas e QR', accent: 'from-red-500 to-rose-600', icon: <ShieldCheck className="w-6 h-6" /> },
    { title: 'Encarregados', value: String(stats.parents), subtitle: 'Famílias ligadas ao ecossistema', accent: 'from-sky-600 to-blue-700', icon: <Bell className="w-6 h-6" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">EduGuard Enterprise</h1>
            <p className="text-sm text-slate-300">Portal executivo para gestão académica e administrativa</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </button>
            <button onClick={() => navigate('/portais')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
              Portais <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
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

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Gestão estratégica</h2>
                <p className="text-sm text-slate-300">Acesso rápido às áreas administrativas já disponíveis.</p>
              </div>
              <button onClick={() => navigate('/admin')} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
                Abrir Admin
              </button>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <button onClick={() => navigate('/school')} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-left hover:bg-slate-900">
                <p className="font-semibold">Painel de Escola</p>
                <p className="text-sm text-slate-400">Entradas, saídas e operação diária</p>
              </button>
              <button onClick={() => navigate('/parent')} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-left hover:bg-slate-900">
                <p className="font-semibold">Pais e Educandos</p>
                <p className="text-sm text-slate-400">Solicitações, notificações e estado</p>
              </button>
              <button onClick={() => navigate('/sistema')} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-left hover:bg-slate-900">
                <p className="font-semibold">Login do Sistema</p>
                <p className="text-sm text-slate-400">Acesso central de todos os perfis</p>
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Escolas</h2>
            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-slate-300">A carregar escolas...</p>
              ) : schools.length === 0 ? (
                <p className="text-slate-400">Nenhuma escola encontrada.</p>
              ) : (
                schools.slice(0, 6).map((school) => (
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Equipa registada</h2>
              <p className="text-sm text-slate-300">Profissionais ligados às escolas, com filtros de consulta rápida.</p>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Procurar por nome, escola, email ou perfil"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 py-3 pl-10 pr-4 text-white outline-none"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleStaff.length === 0 ? (
              <p className="text-slate-400">Nenhum registo encontrado.</p>
            ) : (
              visibleStaff.map((person) => (
                <div key={`${person.id}-${person.email}`} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{person.nome}</p>
                      <p className="text-sm text-slate-400">{person.email || 'Sem email'}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">{person.roleLabel}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">Escola: {person.schoolName}</p>
                  <p className="text-xs text-slate-500 mt-1">{person.telefone || 'Sem telefone'} · {person.source === 'remote' ? 'Servidor' : 'Cache local'}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default EnterprisePortalPage;