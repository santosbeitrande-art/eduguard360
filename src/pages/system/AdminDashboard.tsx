import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Building2, GraduationCap, MapPin, Search } from "lucide-react";

const AdminGlobalDashboard = () => {
  const [escolas, setEscolas] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEscolas: 0,
    totalAlunos: 0,
    totalEntradas: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: escolasData } = await supabase
      .from("escolas")
      .select("*");

    const { data: alunos } = await supabase
      .from("alunos")
      .select("*");

    const { data: entradas } = await supabase
      .from("entradas")
      .select("*");

    setEscolas(escolasData || []);

    setStats({
      totalEscolas: escolasData?.length || 0,
      totalAlunos: alunos?.length || 0,
      totalEntradas: entradas?.length || 0
    });
    setLoading(false);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Admin Global
            </h1>
            <p className="mt-1 text-gray-400">
              Visão geral de todas as escolas e atividades no sistema.
            </p>
          </div>
          <button 
            onClick={loadData}
            className="btn inline-flex items-center justify-center px-4 py-2 shadow-sm"
          >
            Atualizar Dados
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Escolas */}
          <div className="card p-6 relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 bg-blue-500/10 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
            <div className="relative">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Escolas Ativas</h3>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{stats.totalEscolas}</span>
              </div>
            </div>
          </div>

          {/* Card Alunos */}
          <div className="card p-6 relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 bg-indigo-500/10 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
                <GraduationCap className="w-6 h-6" />
              </div>
            </div>
            <div className="relative">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Total de Alunos</h3>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{stats.totalAlunos}</span>
              </div>
            </div>
          </div>

          {/* Card Registos */}
          <div className="card p-6 relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 bg-emerald-500/10 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative flex items-center justify-between mb-4">
              <div className="p-3 bg-[#2ecc71]/20 text-[#2ecc71] rounded-2xl">
                <MapPin className="w-6 h-6" />
              </div>
            </div>
            <div className="relative">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Movimentos (Entradas/Saídas)</h3>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-white">{stats.totalEntradas}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Escolas Registadas</h2>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Procurar escola..."
                className="pl-10 pr-4 py-2 outline-none transition-all w-64"
              />
            </div>
          </div>
          
          {loading ? (
             <div className="p-8 text-center text-gray-400">
               <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#2ecc71] border-t-transparent mx-auto mb-4"></div>
               A carregar dados...
             </div>
          ) : escolas.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
               <Building2 className="w-12 h-12 text-gray-600 mb-3" />
               <p className="text-gray-400">Nenhuma escola cadastrada no momento.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {escolas.map((e) => (
                <div key={e.id} className="p-4 hover:bg-white/5 flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-[#0a192f] border border-white/10 flex items-center justify-center text-blue-400 font-bold">
                      {e.nome.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{e.nome}</p>
                      <p className="text-xs text-gray-400">{e.email || 'Sem e-mail registado'}</p>
                    </div>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#2ecc71]/10 text-[#2ecc71] border border-[#2ecc71]/20">
                      Ativa
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminGlobalDashboard;
