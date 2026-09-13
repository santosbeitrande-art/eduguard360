import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isApprovedByAdmin, isBuilding360ResidentProfile, resolveBuilding360Profile } from '@/lib/building360Access';
import { clearAuthSession } from '@/lib/authSession';

type ResidentTicketType = 'complaint' | 'suggestion' | 'information';
type ResidentTicketStatus = 'submitted' | 'in_review' | 'responded';

type ResidentTicket = {
  id: string;
  type: ResidentTicketType;
  subject: string;
  message: string;
  unit: string;
  residentEmail: string;
  residentName: string;
  status: ResidentTicketStatus;
  response?: string;
  createdAt: string;
  updatedAt: string;
};

const TICKETS_STORAGE_KEY = 'building360.resident.tickets.v1';

const resolveCurrentUserSnapshot = () => {
  for (const key of ['currentUser', 'eduguard_user', 'user']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      continue;
    }
  }
  return null;
};

const resolveAuthToken = (): string => String(localStorage.getItem('eduguard_token') || localStorage.getItem('token') || '').trim();

const readTickets = (): ResidentTicket[] => {
  try {
    const raw = localStorage.getItem(TICKETS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeTickets = (tickets: ResidentTicket[]) => {
  localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
};

const typeLabel: Record<ResidentTicketType, string> = {
  complaint: 'Reclamacao',
  suggestion: 'Sugestao',
  information: 'Informacao',
};

const statusLabel: Record<ResidentTicketStatus, string> = {
  submitted: 'Submetido',
  in_review: 'Em revisao',
  responded: 'Respondido',
};

const statusStyle: Record<ResidentTicketStatus, string> = {
  submitted: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  in_review: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  responded: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
};

const Building360ResidentFrontendPage = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [type, setType] = useState<ResidentTicketType>('complaint');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [unit, setUnit] = useState('');
  const [tickets, setTickets] = useState<ResidentTicket[]>([]);

  const currentUser = useMemo(() => resolveCurrentUserSnapshot(), []);
  const residentEmail = String(currentUser?.email || '').trim().toLowerCase();
  const residentName = String(currentUser?.nome || currentUser?.name || residentEmail || 'Morador').trim();
  const profile = resolveBuilding360Profile(currentUser?.building360_role || currentUser?.perfil || currentUser?.role || '');

  useEffect(() => {
    if (!currentUser || !resolveAuthToken()) {
      navigate('/building360/login?returnTo=%2Fbuilding360%2Fmorador', { replace: true });
      return;
    }

    if (!isApprovedByAdmin(currentUser)) {
      navigate('/building360/login?error=building360-account-not-approved&returnTo=%2Fbuilding360%2Fmorador', { replace: true });
      return;
    }

    if (!isBuilding360ResidentProfile(profile)) {
      navigate('/building360', { replace: true });
      return;
    }

    const mine = readTickets()
      .filter((entry) => String(entry?.residentEmail || '').trim().toLowerCase() === residentEmail)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setTickets(mine);
    setReady(true);
  }, [currentUser, navigate, profile, residentEmail]);

  const pushTicketToApi = async (ticket: ResidentTicket) => {
    const token = resolveAuthToken();
    if (!token) return;

    const payload = {
      title: ticket.subject,
      description: ticket.message,
      category: ticket.type,
      unitCode: ticket.unit || undefined,
      channel: 'resident_frontend',
      reporterEmail: ticket.residentEmail,
      reporterName: ticket.residentName,
      localTicketId: ticket.id,
    };

    await fetch('/api/v1/building360/work-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-enterprise-role': String(currentUser?.building360_role || currentUser?.perfil || currentUser?.role || ''),
        'x-user-id': String(currentUser?.id || currentUser?.user_id || ''),
        'x-school-id': String(currentUser?.escola_id || currentUser?.school_id || currentUser?.tenant_id || ''),
        'x-tenant-id': String(currentUser?.tenant_id || currentUser?.escola_id || currentUser?.school_id || ''),
      },
      body: JSON.stringify(payload),
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!subject.trim() || !message.trim()) {
      setErrorMessage('Preencha assunto e descricao para submeter.');
      return;
    }

    const now = new Date().toISOString();
    const ticket: ResidentTicket = {
      id: `r-${Date.now()}`,
      type,
      subject: subject.trim(),
      message: message.trim(),
      unit: unit.trim(),
      residentEmail,
      residentName,
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    };

    setSubmitting(true);
    try {
      const all = [ticket, ...readTickets()];
      writeTickets(all);
      setTickets(all.filter((entry) => entry.residentEmail === residentEmail));

      try {
        await pushTicketToApi(ticket);
      } catch {
        // Local persistence is the primary fallback when API is unavailable.
      }

      setSubject('');
      setMessage('');
      setUnit('');
      setSuccessMessage('Submissao enviada com sucesso. A gestao do condominio ira analisar e responder.');
    } catch {
      setErrorMessage('Nao foi possivel guardar sua submissao agora. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-300">A validar acesso do morador...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/80">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Meu Condominio</h1>
            <p className="text-xs text-slate-400">Canal do morador para reclamacoes, sugestoes e informacoes</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/portais" className="px-3 py-2 rounded-lg border border-slate-700 text-sm hover:bg-slate-900">Portais</Link>
            <Link to="/building360/login?returnTo=%2Fbuilding360" className="px-3 py-2 rounded-lg border border-slate-700 text-sm hover:bg-slate-900">Trocar conta</Link>
            <button
              type="button"
              onClick={() => {
                clearAuthSession();
                navigate('/building360/login?returnTo=%2Fbuilding360%2Fmorador', { replace: true });
              }}
              className="px-3 py-2 rounded-lg border border-rose-500/50 bg-rose-500/10 text-sm text-rose-200 hover:bg-rose-500/20"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">Nova submissao</h2>
          <p className="text-sm text-slate-300 mt-1">Os registos sao visiveis apenas para a gestao/administracao/proprietario do condominio.</p>

          {errorMessage && <p className="mt-4 rounded-lg border border-rose-700/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">{errorMessage}</p>}
          {successMessage && <p className="mt-4 rounded-lg border border-emerald-700/40 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">{successMessage}</p>}

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label className="block text-sm text-slate-200">
              Tipo
              <select
                value={type}
                onChange={(event) => setType(event.target.value as ResidentTicketType)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
              >
                <option value="complaint">Reclamacao</option>
                <option value="suggestion">Sugestao</option>
                <option value="information">Informacao</option>
              </select>
            </label>

            <label className="block text-sm text-slate-200">
              Assunto
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                placeholder="Ex: Elevador bloco A"
                maxLength={120}
              />
            </label>

            <label className="block text-sm text-slate-200">
              Unidade (opcional)
              <input
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                placeholder="Ex: A-203"
                maxLength={40}
              />
            </label>

            <label className="block text-sm text-slate-200">
              Descricao
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="mt-1 w-full h-36 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                placeholder="Descreva sua reclamacao, sugestao ou informacao"
                maxLength={2000}
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full rounded-xl py-2.5 font-semibold ${submitting ? 'bg-slate-700 text-slate-300' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'}`}
            >
              {submitting ? 'A submeter...' : 'Submeter para a gestao'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">Meu historico</h2>
          <p className="text-sm text-slate-300 mt-1">Acompanhe estado e resposta da administracao.</p>

          <div className="mt-4 space-y-3 max-h-[520px] overflow-auto pr-1">
            {tickets.length === 0 && (
              <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-4 text-sm text-slate-400">
                Ainda nao existem submissoes nesta conta.
              </div>
            )}

            {tickets.map((ticket) => (
              <article key={ticket.id} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{ticket.subject}</p>
                  <span className={`text-xs border rounded-full px-2 py-0.5 ${statusStyle[ticket.status]}`}>
                    {statusLabel[ticket.status]}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{typeLabel[ticket.type]} {ticket.unit ? `| Unidade ${ticket.unit}` : ''}</p>
                <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">{ticket.message}</p>
                {ticket.response && (
                  <div className="mt-2 rounded-lg border border-emerald-700/40 bg-emerald-950/20 px-2 py-2 text-sm text-emerald-100">
                    Resposta da gestao: {ticket.response}
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2">{new Date(ticket.createdAt).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Building360ResidentFrontendPage;
