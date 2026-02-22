
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface CreateParentFormProps {
  operatorId: string;
  operatorName: string;
  operatorRole: string;
  tenantId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CreateParentForm: React.FC<CreateParentFormProps> = ({ operatorId, operatorName, operatorRole, tenantId, onSuccess, onCancel }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; password?: string; emailSent?: boolean } | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const { data } = await supabase.functions.invoke('eduguard-auth', {
        body: { action: 'get_all_users', target_type: 'students', tenant_id: tenantId }
      });
      if (data?.success) setStudents(data.data || []);
    } catch (e) {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const { data } = await supabase.functions.invoke('eduguard-auth', {
        body: {
          action: 'create_parent',
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          student_ids: selectedStudents,
          operator_id: operatorId,
          operator_name: operatorName,
          operator_role: operatorRole,
          tenant_id: tenantId
        }
      });

      if (data?.success) {
        setResult({ success: true, message: data.message, password: data.default_password, emailSent: data.email_sent });
        setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setSelectedStudents([]);
      } else {
        setResult({ success: false, message: data?.error || 'Erro ao criar conta' });
      }
    } catch (err) {
      setResult({ success: false, message: 'Erro de ligação ao servidor' });
    }
    setLoading(false);
  };

  const toggleStudent = (sid: string) => {
    setSelectedStudents(prev => prev.includes(sid) ? prev.filter(s => s !== sid) : [...prev, sid]);
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-[#2ecc71]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          Registar Pai / Encarregado
        </h3>
        {onCancel && <button onClick={onCancel} className="text-gray-400 hover:text-white text-sm">Fechar</button>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Primeiro Nome *</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2ecc71]"
              placeholder="Ex: Carlos" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Apelido</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2ecc71]"
              placeholder="Ex: Machel" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2ecc71]"
            placeholder="email@exemplo.mz" />
          <p className="text-gray-500 text-xs mt-1">As credenciais de acesso serão enviadas para este email</p>
        </div>

        <div>
          <label className="block text-sm text-gray-300 mb-1">Telefone</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#2ecc71]"
            placeholder="+258 84 XXX XXXX" />
        </div>

        {students.length > 0 && (
          <div>
            <label className="block text-sm text-gray-300 mb-2">Associar Educandos (opcional)</label>
            <div className="max-h-40 overflow-y-auto space-y-1 bg-white/5 rounded-lg p-3">
              {students.map(s => (
                <label key={s.student_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" checked={selectedStudents.includes(s.student_id)} onChange={() => toggleStudent(s.student_id)}
                    className="w-4 h-4 rounded border-gray-500 text-[#2ecc71] focus:ring-[#2ecc71]" />
                  <span className="text-white text-sm">{s.first_name} {s.last_name}</span>
                  <span className="text-gray-500 text-xs">{s.grade} - {s.class_name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

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
                    Email com credenciais enviado com sucesso
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

        <div className="flex gap-3">
          <button type="submit" disabled={loading || !firstName.trim() || !email.trim()}
            className="flex-1 py-3 bg-[#2ecc71] hover:bg-[#27ae60] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? (
              <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>A criar...</>
            ) : (
              <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>Criar Conta e Enviar Email</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateParentForm;
