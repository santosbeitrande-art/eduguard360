import React from 'react';

const AdminCredentials: React.FC = () => (
  <section className='mt-10 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-white p-6'>
    <h3 className='text-xl font-bold text-amber-700'>Credenciais de Administrador (teste)</h3>
    <p className='mt-2 text-slate-700'>Use para acessar rapidamente o painel administrativo e validar fluxo.</p>
    <ul className='mt-4 list-disc list-inside text-slate-700'>
      <li>E-mail: <strong>admin@eduguard360.co.mz</strong></li>
      <li>Senha: <strong>Admin@1234</strong></li>
    </ul>
    <p className='mt-2 text-sm text-slate-500'>Altere estas credenciais antes do deploy em produção.</p>
  </section>
);

export default AdminCredentials;