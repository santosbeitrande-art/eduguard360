import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const SchoolDashboard = () => {
  const [data, setData] = useState<EntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [selectedStudentId, setSelectedStudentId] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Ler o utilizador autenticado
  let currentUser: any = null;
  try {
    currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch (e) {
    console.error("Failed to parse currentUser from localStorage");
  }

  const fetchData = async () => {
    setLoading(true);
    
    // Bloquear acesso se não houver utilizador ou se não for admin/director
    if (!currentUser || (currentUser.perfil !== 'admin' && currentUser.perfil !== 'director')) {
      setLoading(false);
      setData([]);
      return;
    }

    let alunosQuery = supabase.from('alunos').select('id, nome, classe, escola_id');

    // Se não for admin global, restringe à sua própria escola
    if (currentUser.perfil !== 'admin') {
      if (!currentUser.escola_id) {
        console.error("Utilizador não tem escola associada.");
        setLoading(false);
        return;
      }
      alunosQuery = alunosQuery.eq('escola_id', currentUser.escola_id);
    }

    const { data: alunosData, error: alunosError } = await alunosQuery;

    if (alunosError) {
      console.error("Erro ao buscar alunos:", alunosError);
      setLoading(false);
      return;
    }

    const studentIds = (alunosData || []).map((a) => a.id);
    if (studentIds.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }

    const { data: entradasData, error: entradasError } = await supabase
      .from("entradas")
      .select('id, tipo, data, aluno_id')
      .in('aluno_id', studentIds)
      .order("data", { ascending: false });

    if (entradasError) {
      console.error("Erro ao buscar dados:", entradasError);
    } else if (entradasData) {
      const alunosMap = new Map((alunosData || []).map((a) => [a.id, a]));

      const enrichedData: EntryRecord[] = entradasData.map((entry: any) => ({
        ...entry,
        alunos: alunosMap.get(entry.aluno_id) || null
      }));
      setData(enrichedData);
    }
    setLoading(false);
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

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 min-h-screen text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Painel da Escola
          </h1>
          <p className="text-gray-400 mt-1">Histórico completo de entradas e saídas com filtros por dia, mês, ano, turma/classe e aluno.</p>
        </div>
        <div className="flex items-center gap-2">
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

export default SchoolDashboard;
