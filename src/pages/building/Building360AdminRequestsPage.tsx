import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('eduguard_user') || '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  }, []);
  const currentRole = String(currentUser.role || currentUser.perfil || '').trim().toLowerCase();
  const isPlatformAdmin = currentUser.auth_portal === 'building360'
    && ['super_admin', 'platform_admin', 'platformadmin', 'admin'].includes(currentRole);

  const loadRequests = useCallback(async () => {
    const token = localStorage.getItem('eduguard_token') || localStorage.getItem('token') || '';
    try {
      const response = await fetch('/api/v1/building360/admin/demo-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Acesso não autorizado à administração dos pedidos (HTTP ${response.status}).`);
      }
      if (!response.ok) {
        throw new Error(
          body.message
            ? `A API Building360 respondeu com HTTP ${response.status}: ${body.message}`
            : `A API Building360 não está disponível (HTTP ${response.status}).`,
        );
      }
      if (!Array.isArray(body)) {
        throw new Error('A API Building360 devolveu uma resposta inválida ao consultar os pedidos.');
      }
      setRequests(body);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error
        ? loadError.message
        : 'Erro de conexão com a API Building360 ao consultar os pedidos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = String(localStorage.getItem('eduguard_token') || localStorage.getItem('token') || '').trim();
    if (!token || currentUser.auth_portal !== 'building360') {
      navigate(`/building360/login?returnTo=${encodeURIComponent('/building360/admin/requests')}`, { replace: true });
      return;
    }
    if (!isPlatformAdmin) {
      setLoading(false);
      return;
    }
    void loadRequests();
  }, [currentUser.auth_portal, isPlatformAdmin, loadRequests, navigate]);

  const updateRequest = async (id: string, action: 'approve' | 'reject' | 'review' | 'complete') => {
    const token = localStorage.getItem('eduguard_token') || localStorage.getItem('token') || '';
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      const isStatusUpdate = action === 'review' || action === 'complete';
      const path = isStatusUpdate
        ? `/api/v1/building360/admin/demo-requests/${encodeURIComponent(id)}/status`
        : `/api/v1/building360/admin/demo-requests/${encodeURIComponent(id)}/${action}`;
      const response = await fetch(path, {
        method: isStatusUpdate ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(isStatusUpdate ? { status: action === 'review' ? 'under_review' : 'completed' } : {}),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || `Não foi possível actualizar o pedido (HTTP ${response.status}).`);
      const notices = {
        approve: 'Organização criada e convite de activação enviado pelo Supabase Auth.',
        reject: 'Pedido rejeitado.',
        review: 'Pedido marcado como em análise.',
        complete: 'Pedido marcado como concluído.',
      };
      setNotice(notices[action]);
      await loadRequests();
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Não foi possível concluir a operação.';
      await loadRequests();
      setError(message);
    } finally {
      setBusyId(null);
    }
  };

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
            ) : !error && requests.length === 0 ? (
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
                      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase text-slate-300">
                        {{
                          pending: 'Pendente',
                          under_review: 'Em análise',
                          provisioning: 'Provisionamento',
                          invitation_failed: 'Convite pendente',
                          approved: 'Aprovado',
                          rejected: 'Rejeitado',
                          completed: 'Concluído',
                        }[request.status] || request.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    {request.message && <p className="mt-4 whitespace-pre-wrap text-sm text-slate-300">{request.message}</p>}
                    {request.provisioningError && (
                      <p className="mt-4 rounded-lg border border-amber-800/60 bg-amber-950/30 p-3 text-sm text-amber-200">
                        Provisionamento: {request.provisioningError}
                      </p>
                    )}
                    {(['pending', 'under_review', 'invitation_failed'].includes(request.status)
                      || (request.status === 'provisioning' && Date.now() - new Date(request.updatedAt).getTime() > 15 * 60 * 1000)) && (
                      <div className="mt-5 flex flex-wrap gap-3">
                        {request.status === 'pending' && (
                          <button
                            disabled={busyId === request.id}
                            onClick={() => void updateRequest(request.id, 'review')}
                            className="rounded-lg border border-sky-700 px-4 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-950/50 disabled:opacity-50"
                          >
                            Marcar em análise
                          </button>
                        )}
                        <button
                          disabled={busyId === request.id}
                          onClick={() => void updateRequest(request.id, 'approve')}
                          className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                        >
                          {busyId === request.id
                            ? 'A processar…'
                            : request.status === 'pending'
                              || request.status === 'under_review'
                              ? 'Aprovar e convidar'
                              : request.status === 'invitation_failed'
                                ? 'Tentar convite novamente'
                                : 'Retomar provisionamento'}
                        </button>
                        {['pending', 'under_review'].includes(request.status) && (
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
                    {request.status === 'approved' && (
                      <button
                        disabled={busyId === request.id}
                        onClick={() => void updateRequest(request.id, 'complete')}
                        className="mt-5 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                      >
                        Marcar como concluído
                      </button>
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
