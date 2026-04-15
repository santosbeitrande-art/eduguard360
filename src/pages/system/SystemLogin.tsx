import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

const SystemLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        alert("E-mail ou senha inválidos.");
        return;
      }

      const userId = data.user.id;
      
      // Buscar utilizador na NOVA tabela "utilizadores" criada no Supabase
      const { data: user } = await supabase
        .from("utilizadores")
        .select("*")
        .eq("auth_id", userId)
        .single();

      if (!user) {
        alert("Utilizador não registado no sistema de acessos.");
        return;
      }

      // Redirecionamento por Perfil da nova tabela
      if (user.perfil === "admin") navigate("/admin");
      else if (user.perfil === "director") navigate("/school");
      else if (user.perfil === "pai") navigate("/parent");
      else if (user.perfil === "scanner") navigate("/scanner");
      else navigate("/");
    } catch (err) {
      console.error(err);
      alert("Erro crítico no login, contacte o suporte.");
    } finally {
      setLoading(false);
    }
  };
  const handleDemoAccess = (role: string) => {
    if (role === "admin") navigate("/admin");
    else if (role === "school") navigate("/school");
    else if (role === "parent") navigate("/parent");
    else if (role === "scanner") navigate("/scanner");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100 blur-3xl opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100 blur-3xl opacity-50"></div>

      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl border border-slate-100 z-10 relative">
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl shadow-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 text-center">EduGuard360</h2>
        <p className="mt-2 text-sm text-slate-500 text-center">Segurança Escolar Transformada em Confiança Digital.</p>

        <div className="mt-8 space-y-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="E-mail de acesso (ex: admin@escola.mz)"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Cidadela Digital Primária (Senha)"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none transition-all"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 text-white px-4 py-3.5 font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5"
          >
            {loading ? "A Autenticar Cofre..." : "Aceder ao Portal Escolar"}
          </button>
        </div>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-400 font-medium tracking-wide text-xs uppercase">Acessos de Demonstração (Bypass)</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleDemoAccess("admin")}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100 transition-colors"
            >
              👑 Global Mestre
            </button>
            <button 
              onClick={() => handleDemoAccess("school")}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors"
            >
              🏫 Dir. Escola
            </button>
            <button 
              onClick={() => handleDemoAccess("parent")}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-colors"
            >
              👨‍👩‍👧 Encarregado
            </button>
            <button 
              onClick={() => handleDemoAccess("scanner")}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-100 transition-colors"
            >
              📷 Segurança QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemLogin;

