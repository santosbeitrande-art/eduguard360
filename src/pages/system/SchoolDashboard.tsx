import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/networkPerformance";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { SystemAuthProvider, useSystemAuth } from "@/context/SystemAuthContext";

const GLOBAL_SYNC_KEY = 'eduguard_global_sync_event';
const LOCAL_STUDENTS_KEY = 'eduguard_local_students';
const LOCAL_ENTRIES_KEY = 'eduguard_local_entries';
const SCHOOL_DASHBOARD_ALLOWED_PROFILES = [
  'admin',
  'super_admin',
  'administrator',
];

const normalizeProfile = (value: unknown): string => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  const normalizedNoSymbols = normalized.replace(/[^a-z0-9]+/g, ' ').trim();

  if (normalized === 'superadmin') return 'super_admin';
  if (
    normalized === 'security'
    || normalized === 'scanner'
    || normalized === 'security_officer'
    || normalized === 'seguranca'
    || normalizedNoSymbols.includes('seguranca operacional')
    || normalizedNoSymbols.includes('security officer')
  ) return 'seguranca';

  return normalized;
};

const getDefaultRouteByProfile = (perfil: string): string => {
  const normalized = normalizeProfile(perfil);
  if (normalized === 'super_admin' || normalized === 'admin') return '/sistema/enterprise';
  if (normalized === 'director') return '/sistema/direcao';
  if (normalized === 'administrator') return '/sistema/administracao';
  if (normalized === 'secretaria') return '/sistema/secretaria';
  if (normalized === 'coordenador') return '/sistema/coordenacao';
  if (normalized === 'professor' || normalized === 'teacher') return '/sistema/professor';
  if (normalized === 'financeiro' || normalized === 'finance') return '/sistema/financeiro';
  if (normalized === 'rh' || normalized === 'hr') return '/sistema/rh';
  if (normalized === 'seguranca') return '/sistema/seguranca';
  if (normalized === 'parent' || normalized === 'guardian') return '/sistema/encarregado';
  if (normalized === 'student' || normalized === 'aluno') return '/sistema/aluno';
  return '/sistema/login';
};

type EntryRecord = {
  id: string;
  tipo: string;
  data: string;
  aluno_id: string;
  alunos?: {
    id: string;
    nome: string;
    classe: string | null;
    escola_id: string | null;
  } | null;
};

const isUuid = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized);
};

type SchoolDashboardProps = {
  title: string;
  description: string;
  logoutReturnTo: string;
  blockedRedirectTo: string;
  allowedProfiles: string[];
};

const SchoolDashboardContent = ({
  title,
  description,
  logoutReturnTo,
  blockedRedirectTo,
  allowedProfiles,
}: SchoolDashboardProps) => {
  const navigate = useNavigate();
  const { user, token } = useSystemAuth();
  const [data, setData] = useState<EntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStudentId, setSelectedStudentId] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadFromLocalFallback = () => {
    try {
      const localStudentsRaw = localStorage.getItem(LOCAL_STUDENTS_KEY);
      const localEntriesRaw = localStorage.getItem(LOCAL_ENTRIES_KEY);
      const localStudents = localStudentsRaw ? JSON.parse(localStudentsRaw) : [];
      const localEntries = localEntriesRaw ? JSON.parse(localEntriesRaw) : [];

      const students = Array.isArray(localStudents) ? localStudents : [];
      const entries = Array.isArray(localEntries) ? localEntries : [];

      const studentMap = new Map(students.map((student: any) => [student.id, student]));
      const fallbackData: EntryRecord[] = entries
        .map((entry: any) => ({
          id: String(entry.id || ''),
          tipo: String(entry.tipo || ''),
          data: String(entry.data || ''),
          aluno_id: String(entry.aluno_id || ''),
          alunos: studentMap.has(entry.aluno_id)
            ? {
                id: String(studentMap.get(entry.aluno_id)?.id || ''),
                nome: String(studentMap.get(entry.aluno_id)?.nome || 'Aluno'),
                classe: String(studentMap.get(entry.aluno_id)?.classe || ''),
                escola_id: String(studentMap.get(entry.aluno_id)?.escola_id || ''),
              }
            : null,
        }))
        .filter((item: EntryRecord) => Boolean(item.aluno_id))
        .sort((a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime());

      setData(fallbackData);
    } catch {
      setData([]);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const legacyUserRaw = localStorage.getItem('currentUser');
      let legacyUser: any = null;
      if (legacyUserRaw) {
        try {
          legacyUser = JSON.parse(legacyUserRaw);
        } catch {
          legacyUser = null;
        }
      }

      const currentUser = user || legacyUser;
      const fallbackProfile = normalizeProfile(currentUser?.role || currentUser?.perfil);
      let authoritativeProfile = fallbackProfile;

      if (token && currentUser) {
        try {
          const headers: HeadersInit = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'x-enterprise-role': String(currentUser?.role || currentUser?.perfil || ''),
            'x-user-id': String(currentUser?.id || currentUser?.user_id || ''),
            'x-school-id': String(currentUser?.school_id || currentUser?.escola_id || currentUser?.tenant_id || ''),
            'x-tenant-id': String(currentUser?.tenant_id || currentUser?.school_id || currentUser?.escola_id || ''),
          };

          const identityResponse = await withTimeout(
            fetch('/api/v1/core?action=identity', {
              method: 'POST',
              headers,
              body: JSON.stringify({ userId: currentUser?.id || currentUser?.user_id || null }),
            }),
            10000,
            'Identity resolve timeout'
          );

          if (identityResponse.ok) {
            const identityPayload = await identityResponse.json();
            const serverRole = identityPayload?.identity?.role;
            if (serverRole) {
              authoritativeProfile = normalizeProfile(serverRole);
            }
          }
        } catch {
          // Keep fallback profile when identity endpoint is temporarily unavailable.
        }
      }

      if (!currentUser || !allowedProfiles.includes(authoritativeProfile)) {
        setData([]);
        navigate(getDefaultRouteByProfile(authoritativeProfile));
        return;
      }

      let alunosQuery = supabase.from('alunos').select('id, nome, classe, escola_id');

      // Se não for Administração Geral (global), restringe à sua própria escola
      if (authoritativeProfile !== 'admin' && authoritativeProfile !== 'super_admin') {
        const schoolId = currentUser?.school_id || currentUser?.escola_id || currentUser?.tenant_id || null;
        if (!schoolId) {
          console.error("Utilizador não tem escola associada.");
          loadFromLocalFallback();
          return;
        }

        if (!isUuid(schoolId)) {
          loadFromLocalFallback();
          return;
        }

        alunosQuery = alunosQuery.eq('escola_id', schoolId);
      }

      const { data: alunosData, error: alunosError } = await withTimeout(alunosQuery, 12000, 'School students timeout');

      if (alunosError) {
        console.error("Erro ao buscar alunos:", alunosError);
        loadFromLocalFallback();
        return;
      }

      const studentIds = (alunosData || []).map((a) => a.id);
      if (studentIds.length === 0) {
        loadFromLocalFallback();
        return;
      }

      const { data: entradasData, error: entradasError } = await withTimeout(
        supabase
          .from("entradas")
          .select('id, tipo, data, aluno_id')
          .in('aluno_id', studentIds)
          .order("data", { ascending: false }),
        12000,
        'School entries timeout'
      );

      if (entradasError) {
        console.error("Erro ao buscar dados:", entradasError);
        loadFromLocalFallback();
      } else if (entradasData) {
        const alunosMap = new Map((alunosData || []).map((a) => [a.id, a]));

        const enrichedData: EntryRecord[] = entradasData.map((entry: any) => ({
          ...entry,
          alunos: alunosMap.get(entry.aluno_id) || null
        }));
        setData(enrichedData);
      }
    } finally {
      setLoading(false);
    }
  };

  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(data.map((item) => String(item.alunos?.classe || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt'));
  }, [data]);

  const studentOptions = useMemo(() => {
    const items = data
      .map((item) => item.alunos)
      .filter((student): student is NonNullable<EntryRecord['alunos']> => Boolean(student));

    const uniqueMap = new Map(items.map((student) => [student.id, student]));
    return Array.from(uniqueMap.values()).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt'));
  }, [data]);

  const filteredData = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return data.filter((item) => {
      const entryDate = item.data ? new Date(item.data) : null;
      const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
      const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

      if (fromDate && (!entryDate || entryDate < fromDate)) return false;
      if (toDate && (!entryDate || entryDate > toDate)) return false;

      if (selectedType !== 'all' && item.tipo !== selectedType) return false;
      if (selectedClass !== 'all' && String(item.alunos?.classe || '') !== selectedClass) return false;
      if (selectedStudentId !== 'all' && item.aluno_id !== selectedStudentId) return false;

      if (!normalizedSearch) return true;

      const studentName = String(item.alunos?.nome || '').toLowerCase();
      const className = String(item.alunos?.classe || '').toLowerCase();
      const typeName = String(item.tipo || '').toLowerCase();
      const dateLabel = item.data ? format(new Date(item.data), 'dd/MM/yyyy HH:mm', { locale: ptBR }).toLowerCase() : '';

      return studentName.includes(normalizedSearch)
        || className.includes(normalizedSearch)
        || typeName.includes(normalizedSearch)
        || dateLabel.includes(normalizedSearch);
    });
  }, [data, dateFrom, dateTo, searchTerm, selectedClass, selectedStudentId, selectedType]);

  const summary = useMemo(() => {
    const latestByStudent = new Map<string, EntryRecord>();
    for (const item of data) {
      if (!item?.aluno_id) continue;
      if (!latestByStudent.has(item.aluno_id)) {
        latestByStudent.set(item.aluno_id, item);
      }
    }

    const studentsInSchool = Array.from(latestByStudent.values()).filter((item) => item.tipo === 'entrada').length;
    const studentsLeftSchool = Array.from(latestByStudent.values()).filter((item) => item.tipo === 'saida').length;

    const today = format(new Date(), 'yyyy-MM-dd');
    const movementsToday = data.filter((item) => {
      if (!item?.data) return false;
      return format(new Date(item.data), 'yyyy-MM-dd') === today;
    }).length;

    return {
      totalStudentsTracked: latestByStudent.size,
      studentsInSchool,
      studentsLeftSchool,
      movementsToday,
    };
  }, [data]);

  const exportFilteredCsv = () => {
    const headers = ['Aluno', 'Turma/Classe', 'Tipo', 'Data', 'Hora'];
    const rows = filteredData.map((item) => {
      const movementDate = item.data ? new Date(item.data) : null;
      const day = movementDate ? format(movementDate, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A';
      const time = movementDate ? format(movementDate, 'HH:mm', { locale: ptBR }) : 'N/A';

      return [
        item.alunos?.nome || 'Aluno desconhecido',
        item.alunos?.classe || 'N/A',
        item.tipo === 'entrada' ? 'Entrada' : 'Saida',
        day,
        time,
      ];
    });

    const escapeCell = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const csvContent = [headers, ...rows].map((line) => line.map(escapeCell).join(';')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = format(new Date(), 'yyyyMMdd-HHmmss');
    link.href = url;
    link.download = `movimentos-escola-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('eduguard_user');
    localStorage.removeItem('eduguard_token');
    void supabase.auth.signOut();
    navigate(logoutReturnTo);
  };

  useEffect(() => {
    if (!user && !localStorage.getItem('currentUser')) {
      navigate(blockedRedirectTo);
      return;
    }
    fetchData();
  }, [user]);

  useEffect(() => {
    const refreshSchoolData = () => {
      fetchData();
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key) return;
      if (
        event.key === GLOBAL_SYNC_KEY ||
        event.key === 'eduguard_admin_students_cache' ||
        event.key === 'eduguard_parent_student_requests' ||
        event.key === 'currentUser'
      ) {
        refreshSchoolData();
      }
    };

    const handleFocus = () => refreshSchoolData();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshSchoolData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshSchoolData();
      }
    }, 20000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 min-h-screen text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {title}
          </h1>
          <p className="text-gray-400 mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            Terminar Sessao
          </button>
          <button
            onClick={exportFilteredCsv}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            Baixar CSV
          </button>
          <button 
            onClick={fetchData}
            className="btn px-4 py-2 shadow-sm flex items-center gap-2"
          >
            <span>Atualizar Dados</span>
          </button>
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
          <div className="rounded-xl border border-white/10 bg-[#03121e] px-4 py-3">
            <p className="text-xs text-gray-400">Alunos monitorados</p>
            <p className="text-2xl font-bold text-white">{summary.totalStudentsTracked}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <p className="text-xs text-emerald-200">Na escola agora</p>
            <p className="text-2xl font-bold text-emerald-100">{summary.studentsInSchool}</p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-xs text-amber-200">Fora da escola</p>
            <p className="text-2xl font-bold text-amber-100">{summary.studentsLeftSchool}</p>
          </div>
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3">
            <p className="text-xs text-sky-200">Movimentos hoje</p>
            <p className="text-2xl font-bold text-sky-100">{summary.movementsToday}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Procurar aluno, classe, tipo, data"
            className="xl:col-span-2 rounded-xl border border-white/10 bg-[#03121e] px-3 py-2 text-white outline-none"
          />

          <select
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
            aria-label="Filtrar por classe"
            className="rounded-xl border border-white/10 bg-[#03121e] px-3 py-2 text-white outline-none"
          >
            <option value="all">Todas as classes</option>
            {uniqueClasses.map((className) => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>

          <select
            value={selectedStudentId}
            onChange={(event) => setSelectedStudentId(event.target.value)}
            aria-label="Filtrar por aluno"
            className="rounded-xl border border-white/10 bg-[#03121e] px-3 py-2 text-white outline-none"
          >
            <option value="all">Todos os alunos</option>
            {studentOptions.map((student) => (
              <option key={student.id} value={student.id}>{student.nome}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
            aria-label="Filtrar por tipo de movimento"
            className="rounded-xl border border-white/10 bg-[#03121e] px-3 py-2 text-white outline-none"
          >
            <option value="all">Entrada e saída</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 whitespace-nowrap">De</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              title="Data inicial"
              className="w-full rounded-xl border border-white/10 bg-[#03121e] px-3 py-2 text-white outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 whitespace-nowrap">Até</label>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              title="Data final"
              className="w-full rounded-xl border border-white/10 bg-[#03121e] px-3 py-2 text-white outline-none"
            />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-gray-300">
              <tr>
                <th className="px-6 py-4 font-semibold">Aluno</th>
                <th className="px-6 py-4 font-semibold">Turma</th>
                <th className="px-6 py-4 font-semibold">Tipo</th>
                <th className="px-6 py-4 font-semibold">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#2ecc71] border-t-transparent mx-auto mb-4"></div>
                    A carregar dados...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    Nenhum registo encontrado para o filtro aplicado.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, i) => (
                  <tr key={item.id || i} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">
                      {item.alunos?.nome}
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {item.alunos?.classe || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${
                        item.tipo === 'entrada' ? 'bg-[#2ecc71]/10 text-[#2ecc71] border-[#2ecc71]/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                      }`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {item.data ? format(new Date(item.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const SchoolDashboardPage = (props: SchoolDashboardProps) => (
  <SystemAuthProvider><SchoolDashboardContent {...props} /></SystemAuthProvider>
);

const SchoolDashboard = () => (
  <SchoolDashboardPage
    title="Painel da Escola"
    description="Histórico completo de entradas e saídas com filtros por dia, mês, ano, turma/classe e aluno."
    logoutReturnTo="/sistema?returnTo=%2Fsistema%2Fescola"
    blockedRedirectTo="/sistema/login?returnTo=%2Fsistema%2Fescola"
    allowedProfiles={SCHOOL_DASHBOARD_ALLOWED_PROFILES}
  />
);

export default SchoolDashboard;
