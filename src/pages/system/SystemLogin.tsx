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
      // Bypass automático (Hardcoded) para o Admin Principal
      if (email === "admin@eduguard360.co.mz" && password === "Admin1234admin") {
        const adminUser = {
          id: "bypass-admin-id",
          nome: "Administrador Global",
          email: "admin@eduguard360.co.mz",
          perfil: "admin",
          escola_id: null,
          canAccessParent: true,
          canAccessSchool: true
        };
        localStorage.setItem("currentUser", JSON.stringify(adminUser));
        navigate("/admin");
        return;
      }

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

      // Guardar utilizador logado no contexto/localStorage
      localStorage.setItem("currentUser", JSON.stringify(user));

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
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleDemoAccess = (role: string) => {
    if (role === "admin") {
      setEmail("admin@eduguard360.co.mz");
      setPassword("Admin1234admin");
      setInfoMessage("Global Mestre é o mesmo que Admin Global: utilize admin@eduguard360.co.mz e Admin1234admin e depois clique em Aceder ao Portal Escolar.");
      return;
    }

    let mockUser: any = null;
    if (role === "school") {
      mockUser = { id: "demo-school", perfil: "director", nome: "Escola Demo", escola_id: "demo-school-id" };
      localStorage.setItem("currentUser", JSON.stringify(mockUser));
      navigate("/school");
    }
    else if (role === "parent") {
      mockUser = { id: "demo-parent", perfil: "pai", nome: "Pai Demo" };
      localStorage.setItem("currentUser", JSON.stringify(mockUser));
      navigate("/parent");
    }
    else if (role === "scanner") {
      mockUser = { id: "demo-scanner", perfil: "scanner", nome: "Scanner", escola_id: "demo-school-id" };
      localStorage.setItem("currentUser", JSON.stringify(mockUser));
      navigate("/scanner");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500 blur-3xl opacity-20"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500 blur-3xl opacity-20"></div>

      <div className="w-full max-w-md card p-8 z-10 relative">
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl shadow-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center">EduGuard360</h2>
        <p className="mt-2 text-sm text-[#9bbbc9] text-center">Segurança Escolar Transformada em Confiança Digital.</p>

        <div className="mt-8 space-y-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="E-mail de acesso (ex: admin@escola.mz)"
            className="w-full rounded-xl px-4 py-3 outline-none transition-all"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Cidadela Digital Primária (Senha)"
            className="w-full rounded-xl px-4 py-3 outline-none transition-all"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn w-full px-4 py-3.5 font-semibold shadow-lg transition-all hover:-translate-y-0.5 mt-2"
          >
            {loading ? "A Autenticar Cofre..." : "Aceder ao Portal Escolar"}
          </button>
        </div>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2e5a6e]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#132f3f] text-[#9bbbc9] font-medium tracking-wide text-xs uppercase">Acessos de Demonstração</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleDemoAccess("admin")}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#1c3b4d] !important border border-[#2e5a6e] hover:bg-[#2e5a6e] transition-colors"
            >
              👑 Admin Global
            </button>
            <button 
              onClick={() => handleDemoAccess("school")}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#1c3b4d] !important border border-[#2e5a6e] hover:bg-[#2e5a6e] transition-colors"
            >
              🏫 Dir. Escola
            </button>
            <button 
              onClick={() => handleDemoAccess("parent")}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#1c3b4d] !important border border-[#2e5a6e] hover:bg-[#2e5a6e] transition-colors"
            >
              👨‍👩‍👧 Encarregado
            </button>
            <button 
              onClick={() => handleDemoAccess("scanner")}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#1c3b4d] !important border border-[#2e5a6e] hover:bg-[#2e5a6e] transition-colors"
            >
              📷 Segurança QR
            </button>
          </div>
          {infoMessage && (
            <p className="mt-3 text-sm text-yellow-300">{infoMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemLogin;

