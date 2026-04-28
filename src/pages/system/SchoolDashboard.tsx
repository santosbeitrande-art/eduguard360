import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const SchoolDashboard = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

    let query = supabase
      .from("entradas")
      .select(`
        *,
        alunos!inner(nome, classe, escola_id)
      `)
      .order("data", { ascending: false });

    // Se não for admin global, restringe à sua própria escola
    if (currentUser.perfil !== 'admin') {
      if (!currentUser.escola_id) {
        console.error("Utilizador não tem escola associada.");
        setLoading(false);
        return;
      }
      query = query.eq("alunos.escola_id", currentUser.escola_id);
    }

    const { data: entradasData, error } = await query;

    if (error) {
      console.error("Erro ao buscar dados:", error);
    } else {
      setData(entradasData || []);
    }
    setLoading(false);
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
          <p className="text-gray-400 mt-1">Acompanhe as entradas e saídas dos alunos em tempo real.</p>
        </div>
        <button 
          onClick={fetchData}
          className="btn px-4 py-2 shadow-sm flex items-center gap-2"
        >
          <span>Atualizar Dados</span>
        </button>
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
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                    Nenhum registo encontrado para esta escola.
                  </td>
                </tr>
              ) : (
                data.map((item, i) => (
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
