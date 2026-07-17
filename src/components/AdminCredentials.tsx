import React from 'react';

const AdminCredentials: React.FC = () => (
  <section className='mt-10 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-white p-6'>
    <h3 className='text-xl font-bold text-amber-700'>Acesso Administrativo (teste)</h3>
    <p className='mt-2 text-slate-700'>As credenciais do admin são definidas apenas no ambiente seguro do backend.</p>
    <ul className='mt-4 list-disc list-inside text-slate-700'>
      <li>Use o utilizador administrativo provisionado para o ambiente atual.</li>
      <li>Confirme que <strong>INTERNAL_ADMIN_PASSWORD</strong> e <strong>VERIFY_ADMIN_TOKEN</strong> estão configurados.</li>
    </ul>
    <p className='mt-2 text-sm text-slate-500'>Nunca publique palavras-passe ou tokens no repositório.</p>
  </section>
);

export default AdminCredentials;