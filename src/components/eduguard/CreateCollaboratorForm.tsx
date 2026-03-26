
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface CreateCollaboratorFormProps {
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  tenantId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ROLE_OPTIONS = [
  { value: 'sub_admin', label: 'Colaborador Admin', desc: 'Acesso quase total, sem gestão de tenants/billing', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: '#e74c3c', onlySuper: true },
  { value: 'school_admin', label: 'Gestor de Escola', desc: 'Gestão de alunos, pais, presenças e relatórios', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: '#3498db', onlySuper: false },
  { value: 'security', label: 'Segurança / Portaria', desc: 'Leitura de QR codes e registo de entradas/saídas', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', color: '#2ecc71', onlySuper: false }
];

const CreateCollaboratorForm: React.FC<CreateCollaboratorFormProps> = ({ operatorId, operatorName, operatorRole, tenantId, onSuccess, onCancel }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('school_admin');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; password?: string; emailSent?: boolean } | null>(null);

  const availableRoles = ROLE_OPTIONS.filter(r => !r.onlySuper || operatorRole === 'super_admin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim() || !role) return;
    setLoading(true);
    setResult(null);

    try {
      const { data } = await supabase.functions.invoke('eduguard-auth', {
        body: {
          action: 'create_system_user',
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          role,
          school_id: 'SCH-001',
          operator_id: operatorId,
          operator_name: operatorName,
          operator_role: operatorRole,
          tenant_id: tenantId
        }
      });

      if (data?.success) {
        setResult({ success: true, message: data.message, password: data.default_password, emailSent: data.email_sent });
        setFirstName(''); setLastName(''); setEmail('');
      } else {
        setResult({ success: false, message: data?.error || 'Erro ao criar utilizador' });
      }
    } catch (err) {
      setResult({ success: false, message: 'Erro de ligação ao servidor' });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-[#2ecc71]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          Registar Colaborador / Funcionário
        </h3>
        {onCancel && <button onClick={onCancel} className="text-gray-400 hover:text-white text-sm">Fechar</button>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role Selection */}
        <div>
          <label className="block text-sm text-gray-300 mb-2">Função *</label>
          <div className="grid gap-2">
            {availableRoles.map(r => (
              <label key={r.value} onClick={() => setRole(r.value)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${role === r.value ? 'bg-white/10 border-[#2ecc71]/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: r.color + '33' }}>
                  <svg className="w-5 h-5" style={{ color: r.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={r.icon} /></svg>
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{r.label}</p>
                  <p className="text-gray-500 text-xs">{r.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${role === r.value ? 'border-[#2ecc71] bg-[#2ecc71]' : 'border-gray-500'}`}>
                  {role === r.value && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Primeiro Nome *</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2ecc71]"
              placeholder="Ex: António" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Apelido</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2ecc71]"
              placeholder="Ex: Silva" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2ecc71]"
            placeholder="email@instituicao.mz" />
          <p className="text-gray-500 text-xs mt-1">As credenciais serão enviadas para este email</p>
        </div>

        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-[#2ecc71]/20 border border-[#2ecc71]/30' : 'bg-red-500/20 border border-red-500/30'}`}>
            <p className={`text-sm font-medium ${result.success ? 'text-[#2ecc71]' : 'text-red-400'}`}>{result.message}</p>
            {result.success && result.password && (
              <div className="mt-3 p-3 bg-white/10 rounded-lg">
                <p className="text-gray-300 text-xs mb-1">Palavra-passe gerada:</p>
                <p className="text-white font-mono text-lg tracking-wider">{result.password}</p>
                {result.emailSent ? (
                  <p className="text-[#2ecc71] text-xs mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Email com credenciais enviado
                  </p>
                ) : (
                  <p className="text-yellow-400 text-xs mt-2">Email não enviado. Comunique as credenciais manualmente.</p>
                )}
              </div>
            )}
            {result.success && (
              <button type="button" onClick={() => { setResult(null); onSuccess?.(); }} className="mt-3 text-[#2ecc71] text-sm hover:underline">
                Registar outro
              </button>
            )}
          </div>
        )}

        <button type="submit" disabled={loading || !firstName.trim() || !email.trim()}
          className="w-full py-3 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? (
            <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>A criar...</>
          ) : (
            <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>Criar Conta e Enviar Email</>
          )}
        </button>
      </form>
    </div>
  );
};

export default CreateCollaboratorForm;
