import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type DemoRequest = {
  id: string;
  name: string;
  organizationName: string;
  email: string;
  phone: string | null;
  city: string;
  buildingName: string;
  plan: string;
  message: string | null;
  status: string;
  provisioningError: string | null;
  createdAt: string;
  updatedAt: string;
};

const Building360AdminRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    const token = localStorage.getItem('eduguard_token') || localStorage.getItem('token') || '';
    try {
      const response = await fetch('/api/v1/building360/admin/demo-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'Não foi possível consultar os pedidos.');
      setRequests(Array.isArray(body) ? body : []);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao consultar pedidos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const updateRequest = async (id: string, action: 'approve' | 'reject') => {
    const token = localStorage.getItem('eduguard_token') || localStorage.getItem('token') || '';
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/building360/admin/demo-requests/${encodeURIComponent(id)}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || `Não foi possível ${action === 'approve' ? 'aprovar' : 'rejeitar'} o pedido.`);
      setNotice(action === 'approve'
        ? 'Organização criada e convite de activação enviado pelo Supabase Auth.'
        : 'Pedido rejeitado.');
      await loadRequests();
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Não foi possível concluir a operação.';
      await loadRequests();
      setError(message);
    } finally {
      setBusyId(null);
    }
  };

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('eduguard_user') || '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  })();
  const currentRole = String(currentUser.role || currentUser.perfil || '').trim().toLowerCase();
  const isPlatformAdmin = ['super_admin', 'platform_admin', 'platformadmin', 'admin'].includes(currentRole);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <main className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">Building360 · Administração da plataforma</p>
            <h1 className="mt-2 text-3xl font-black text-white">Pedidos de demonstração</h1>
          </div>
          <Link to="/building360" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900">
            Voltar à página comercial
          </Link>
        </div>

        {!isPlatformAdmin && (
          <div role="alert" className="rounded-xl border border-red-800 bg-red-950/40 p-5 text-red-100">
            Esta área é reservada à administração da plataforma. A API também valida esta permissão no servidor.
          </div>
        )}

        {isPlatformAdmin && (
          <>
            <p className="mb-5 max-w-3xl text-sm leading-relaxed text-slate-400">
              Aprovar cria uma organização, um primeiro edifício e o acesso de administrador no tenant; em seguida,
              envia o convite de activação pela configuração Supabase Auth do servidor.
            </p>
            {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-950/50 p-3 text-sm text-emerald-200">{notice}</p>}
            {error && <p role="alert" className="mb-4 rounded-lg bg-red-950/50 p-3 text-sm text-red-200">{error}</p>}
            {loading ? (
              <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">A carregar pedidos…</p>
            ) : requests.length === 0 ? (
              <p className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-300">Não existem pedidos de demonstração.</p>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <article key={request.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-bold text-white">{request.organizationName} · {request.buildingName}</h2>
                        <p className="mt-1 text-sm text-slate-300">{request.name} · {request.email}{request.phone ? ` · ${request.phone}` : ''}</p>
                        <p className="mt-1 text-xs text-slate-400">{request.city} · Plano {request.plan} · {new Date(request.createdAt).toLocaleString()}</p>
                      </div>
                      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase text-slate-300">{request.status.replaceAll('_', ' ')}</span>
                    </div>
                    {request.message && <p className="mt-4 whitespace-pre-wrap text-sm text-slate-300">{request.message}</p>}
                    {request.provisioningError && (
                      <p className="mt-4 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-sm text-amber-200">
                        Provisionamento: {request.provisioningError}
                      </p>
                    )}
                    {(['pending', 'invitation_failed'].includes(request.status)
                      || (request.status === 'provisioning' && Date.now() - new Date(request.updatedAt).getTime() > 15 * 60 * 1000)) && (
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          disabled={busyId === request.id}
                          onClick={() => void updateRequest(request.id, 'approve')}
                          className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                        >
                          {busyId === request.id
                            ? 'A processar…'
                            : request.status === 'pending'
                              ? 'Aprovar e convidar'
                              : request.status === 'invitation_failed'
                                ? 'Tentar convite novamente'
                                : 'Retomar provisionamento'}
                        </button>
                        {request.status === 'pending' && (
                          <button
                            disabled={busyId === request.id}
                            onClick={() => void updateRequest(request.id, 'reject')}
                            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                          >
                            Rejeitar pedido
                          </button>
                        )}
                        {request.status === 'provisioning' && Date.now() - new Date(request.updatedAt).getTime() <= 15 * 60 * 1000 && (
                          <p className="mt-4 text-sm text-sky-200">Provisionamento em curso. A opção de retoma aparecerá se o processo ficar interrompido por mais de 15 minutos.</p>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Building360AdminRequestsPage;
