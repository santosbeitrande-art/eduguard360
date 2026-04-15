import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const AdminGlobalDashboard = () => {
  const [escolas, setEscolas] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEscolas: 0,
    totalAlunos: 0,
    totalEntradas: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-slate-800">📊 Admin Global</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
          <span className="text-4xl mb-4">🏫</span>
          <h3 className="text-sm font-medium text-slate-500 uppercase">Escolas</h3>
          <p className="text-3xl font-bold text-slate-800">{stats.totalEscolas}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
          <span className="text-4xl mb-4">👨‍🎓</span>
          <h3 className="text-sm font-medium text-slate-500 uppercase">Alunos</h3>
          <p className="text-3xl font-bold text-slate-800">{stats.totalAlunos}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center">
          <span className="text-4xl mb-4">📍</span>
          <h3 className="text-sm font-medium text-slate-500 uppercase">Registos</h3>
          <p className="text-3xl font-bold text-slate-800">{stats.totalEntradas}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Lista de Escolas Registadas</h2>
        
        {escolas.length === 0 ? (
          <p className="text-slate-500 text-center py-4">Nenhuma escola cadastrada.</p>
        ) : (
          <ul className="space-y-3">
            {escolas.map((e) => (
              <li key={e.id} className="flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors">
                <span className="font-medium text-slate-700">{e.nome}</span>
                <span className="text-sm text-slate-500">{e.email || 'Sem e-mail'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AdminGlobalDashboard;
