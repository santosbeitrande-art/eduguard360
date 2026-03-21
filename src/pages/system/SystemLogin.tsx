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
      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", userId)
        .single();

      if (!user) {
        alert("Usuário não encontrado.");
        return;
      }

      if (user.role === "super_admin") navigate("/sistema/admin");
      else if (user.role === "school_admin") navigate("/sistema/escola");
      else if (user.role === "parent") navigate("/sistema/pais");
      else if (user.role === "security") navigate("/sistema/scanner");
      else navigate("/");
    } catch (err) {
      console.error(err);
      alert("Erro no login, tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-slate-800">Entrar no EduGuard360</h2>
        <p className="mt-2 text-sm text-slate-600">Use seu e-mail de administrador ou escola.</p>

        <div className="mt-6 space-y-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="email@escola.com"
            className="w-full rounded-lg border px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Senha"
            className="w-full rounded-lg border px-4 py-3 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 text-white px-4 py-3 font-semibold hover:bg-indigo-700 transition"
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemLogin;

