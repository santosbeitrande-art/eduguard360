
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SystemAuthProvider, useSystemAuth } from '@/context/SystemAuthContext';

const ShieldIcon = () => (
  <svg className="w-12 h-12 text-[#2ecc71]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const LoginContent: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user, isLoading } = useSystemAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'parent' | 'system'>('parent');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.type === 'parent') navigate('/sistema/pais');
      else if (user.role === 'security') navigate('/sistema/scanner');
      else if (user.role === 'super_admin') navigate('/sistema/admin');
      else navigate('/sistema/escola');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password, userType);
    if (!result.success) setError(result.error || 'Erro de autenticação');
    setLoading(false);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#0b1d2a] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2ecc71] border-t-transparent"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1d2a] via-[#0f2a3d] to-[#0b1d2a] flex flex-col">
      <header className="p-6">
        <Link to="/" className="flex items-center gap-3 w-fit">
          <ShieldIcon />
          <span className="text-2xl font-bold text-white">EDU<span className="text-[#2ecc71]">•</span>GUARD360</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Acesso ao Sistema</h1>
              <p className="text-gray-300">Entre com as suas credenciais</p>
            </div>

            <div className="flex bg-white/10 rounded-lg p-1 mb-6">
              <button type="button" onClick={() => setUserType('parent')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${userType === 'parent' ? 'bg-[#2ecc71] text-white' : 'text-gray-300 hover:text-white'}`}>
                Pais / Encarregados
              </button>
              <button type="button" onClick={() => setUserType('system')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${userType === 'system' ? 'bg-[#2ecc71] text-white' : 'text-gray-300 hover:text-white'}`}>
                Funcionários
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2ecc71] transition-all"
                  placeholder="seu.email@exemplo.mz" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Palavra-passe</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2ecc71] transition-all"
                  placeholder="••••••••" required />
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? (<><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>A entrar...</>) : 'Entrar'}
              </button>
            </form>

            {/* Security notice */}
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400/80 text-xs text-center">
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                No primeiro acesso, será solicitada a alteração da palavra-passe por razões de segurança.
              </p>
            </div>


            {/* Demo info */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <p className="text-gray-500 text-xs text-center">
                Contas de demonstração (apenas quando o servidor estiver offline):
              </p>
              <p className="text-gray-600 text-xs text-center mt-1">
                demo.pai@eduguard360.co.mz / demo.escola@eduguard360.co.mz (senha: demo123)
              </p>
            </div>

          </div>

          <p className="text-center text-gray-400 text-sm mt-6">
            <Link to="/" className="hover:text-[#2ecc71] transition-colors">← Voltar ao site institucional</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const SystemLogin: React.FC = () => (
  <SystemAuthProvider><LoginContent /></SystemAuthProvider>
);

export default SystemLogin;
