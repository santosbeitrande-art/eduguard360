import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { clearAuthSession } from '@/lib/authSession';
import {
  isApprovedByAdmin,
  isBuilding360ManagementProfile,
  isBuilding360ResidentProfile,
  resolveBuilding360Profile,
} from '@/lib/building360Access';

type SessionUser = Record<string, unknown>;

type Invoice = {
  id: string;
  amount: number | string;
  currency: string;
  issuedAt: string;
  status: string;
};

type Receipt = {
  invoiceId: string;
  amount: number | string;
  currency: string;
  issuedAt: string;
};

type LedgerEntry = {
  amount: number | string;
  direction: string;
  entryType: string;
  occurredAt: string;
  referenceId?: string | null;
};

type WorkOrder = {
  id: string;
  title: string;
  status: string;
  priority?: string;
  createdAt?: string;
};

type Overview = {
  tenantId?: string;
  portfolio?: { sites?: number; buildings?: number; units?: number };
};

const readSessionUser = (): SessionUser | null => {
  for (const key of ['currentUser', 'eduguard_user', 'user']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as SessionUser;
      }
    } catch {
      continue;
    }
  }
  return null;
};

const getToken = () =>
  String(localStorage.getItem('eduguard_token') || localStorage.getItem('token') || '').trim();

const formatMzn = (amount: number) =>
  `${amount.toLocaleString('pt-MZ', { maximumFractionDigits: 2 })} MZN`;

const toAmount = (value: number | string) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getRows = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data;
  }
  return [];
};

const Building360DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [unavailableData, setUnavailableData] = useState<string[]>([]);
  const [hasOtherCurrency, setHasOtherCurrency] = useState(false);

  useEffect(() => {
    const sessionUser = readSessionUser();
    const token = getToken();
    if (!sessionUser || !token || !isApprovedByAdmin(sessionUser)) {
      navigate('/building360/login?returnTo=%2Fbuilding360%2Fdashboard', { replace: true });
      return;
    }

    const profile = resolveBuilding360Profile(
      sessionUser.building360_role || sessionUser.perfil || sessionUser.role,
    );
    if (profile === 'platform_admin') {
      navigate('/sistema/admin', { replace: true });
      return;
    }
    if (isBuilding360ResidentProfile(profile)) {
      navigate('/building360/morador', { replace: true });
      return;
    }
    if (!isBuilding360ManagementProfile(profile)) {
      navigate('/portais', { replace: true });
      return;
    }
    setUser(sessionUser);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    const tenantId = String(user.tenant_id || user.escola_id || user.school_id || '').trim();
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setLoadError('');
      const headers = new Headers({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-enterprise-role': String(user.building360_role || user.perfil || user.role || ''),
        'x-user-id': String(user.id || user.user_id || ''),
        'x-school-id': String(user.escola_id || user.school_id || tenantId),
        'x-tenant-id': tenantId,
      });

      const fetchJson = async (path: string) => {
        const response = await fetch(path, { headers, signal: controller.signal });
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            body && typeof body === 'object' && 'message' in body
              ? String((body as { message: unknown }).message)
              : `Pedido recusado (HTTP ${response.status}).`;
          throw new Error(message);
        }
        return body;
      };

      const [overviewResult, invoicesResult, receiptsResult, workOrdersResult, ledgerResult] =
        await Promise.allSettled([
          fetchJson('/api/v1/building360/overview'),
          fetchJson('/api/v1/building360/finance/invoices'),
          fetchJson('/api/v1/building360/finance/receipts'),
          fetchJson('/api/v1/building360/work-orders'),
          fetchJson('/api/v1/building360/finance/ledger'),
        ]);

      if (controller.signal.aborted) return;
      const failures: string[] = [];
      if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value as Overview);
      else failures.push(`carteira: ${overviewResult.reason instanceof Error ? overviewResult.reason.message : String(overviewResult.reason)}`);
      if (invoicesResult.status === 'fulfilled') setInvoices(getRows<Invoice>(invoicesResult.value));
      else failures.push(`cobranças: ${invoicesResult.reason instanceof Error ? invoicesResult.reason.message : String(invoicesResult.reason)}`);
      if (receiptsResult.status === 'fulfilled') setReceipts(getRows<Receipt>(receiptsResult.value));
      else failures.push(`recibos: ${receiptsResult.reason instanceof Error ? receiptsResult.reason.message : String(receiptsResult.reason)}`);
      if (workOrdersResult.status === 'fulfilled') setWorkOrders(getRows<WorkOrder>(workOrdersResult.value));
      else failures.push(`pedidos: ${workOrdersResult.reason instanceof Error ? workOrdersResult.reason.message : String(workOrdersResult.reason)}`);
      if (ledgerResult.status === 'fulfilled') setLedger(getRows<LedgerEntry>(ledgerResult.value));
      else failures.push(`livro financeiro: ${ledgerResult.reason instanceof Error ? ledgerResult.reason.message : String(ledgerResult.reason)}`);

      const loadedInvoices = invoicesResult.status === 'fulfilled' ? getRows<Invoice>(invoicesResult.value) : [];
      const loadedReceipts = receiptsResult.status === 'fulfilled' ? getRows<Receipt>(receiptsResult.value) : [];
      setHasOtherCurrency(
        loadedInvoices.some((invoice) => invoice.currency !== 'MZN')
        || loadedReceipts.some((receipt) => receipt.currency !== 'MZN'),
      );
      setUnavailableData([
        ...(overviewResult.status === 'rejected' ? ['overview'] : []),
        ...(invoicesResult.status === 'rejected' ? ['invoices'] : []),
        ...(receiptsResult.status === 'rejected' ? ['receipts'] : []),
        ...(workOrdersResult.status === 'rejected' ? ['workOrders'] : []),
        ...(ledgerResult.status === 'rejected' ? ['ledger'] : []),
      ]);
      setLoadError(failures.join(' '));
      setLoading(false);
    };

    void load();
    return () => controller.abort();
  }, [user]);

  const metrics = useMemo(() => {
    const period = currentPeriod();
    const validInvoices = invoices.filter((invoice) => invoice.status !== 'void' && invoice.currency === 'MZN');
    const periodInvoices = validInvoices.filter((invoice) => invoice.issuedAt?.startsWith(period));
    const periodInvoiceIds = new Set(periodInvoices.map((invoice) => invoice.id));
    const collectedThisPeriod = receipts
      .filter((receipt) => receipt.issuedAt?.startsWith(period) && receipt.currency === 'MZN')
      .reduce((total, receipt) => total + toAmount(receipt.amount), 0);
    const dueTotal = validInvoices.reduce((total, invoice) => {
      const paidAgainstInvoice = receipts
        .filter((receipt) => receipt.invoiceId === invoice.id && receipt.currency === invoice.currency)
        .reduce((paid, receipt) => paid + toAmount(receipt.amount), 0);
      return total + Math.max(0, toAmount(invoice.amount) - paidAgainstInvoice);
    }, 0);
    const chargedThisPeriod = periodInvoices.reduce((total, invoice) => total + toAmount(invoice.amount), 0);
    const collectedAgainstPeriodInvoices = receipts
      .filter((receipt) => periodInvoiceIds.has(receipt.invoiceId) && receipt.currency === 'MZN')
      .reduce((total, receipt) => total + toAmount(receipt.amount), 0);
    const outstandingThisPeriod = periodInvoices.reduce((total, invoice) => {
      const paid = receipts
        .filter((receipt) => receipt.invoiceId === invoice.id && receipt.currency === invoice.currency)
        .reduce((sum, receipt) => sum + toAmount(receipt.amount), 0);
      return total + Math.max(0, toAmount(invoice.amount) - paid);
    }, 0);
    const openRequests = workOrders.filter(
      (workOrder) => !['done', 'cancelled'].includes(workOrder.status),
    ).length;

    const openingBalance = ledger
      .filter((entry) => entry.entryType === 'system_opening_balance' && entry.direction === 'credit')
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
    const sinceOpening = openingBalance?.occurredAt || '';
    const expensesThisPeriod = ledger
      .filter((entry) => entry.entryType === 'expense' && entry.occurredAt?.startsWith(period))
      .reduce((total, entry) => total + toAmount(entry.amount), 0);
    const systemBalance = toAmount(openingBalance?.amount || 0)
      + receipts
        .filter((receipt) => !sinceOpening || receipt.issuedAt >= sinceOpening)
        .reduce((total, receipt) => total + toAmount(receipt.amount), 0)
      - ledger
        .filter((entry) => entry.entryType === 'expense' && entry.direction === 'debit' && (!sinceOpening || entry.occurredAt >= sinceOpening))
        .reduce((total, entry) => total + toAmount(entry.amount), 0);
    const bankReconciled = ledger
      .filter((entry) => entry.entryType === 'bank_reconciled')
      .reduce((total, entry) => total + toAmount(entry.amount), 0);

    return {
      chargedThisPeriod,
      collectedThisPeriod,
      outstandingThisPeriod,
      outstandingAllPeriods: dueTotal,
      openRequests,
      expensesThisPeriod,
      systemBalance,
      bankReconciled,
      collectionRate: chargedThisPeriod > 0
        ? Math.round((collectedAgainstPeriodInvoices / chargedThisPeriod) * 100)
        : 0,
    };
  }, [invoices, ledger, receipts, workOrders]);

  const profile = resolveBuilding360Profile(
    user?.building360_role || user?.perfil || user?.role || '',
  );
  const canConfigure = ['organization_admin', 'building_manager'].includes(profile);
  const workspaceProfile = profile || 'organization_admin';
  const workspace = (module: string) => `/building360/workspace/${workspaceProfile}/${module}`;
  const periodLabel = new Intl.DateTimeFormat('pt-MZ', { month: 'long', year: 'numeric' }).format(new Date());

  const profileModules: Record<string, string[]> = {
    platform_admin: ['property', 'people', 'finance', 'maintenance', 'documents', 'buildingpass', 'community', 'request', 'complaint', 'asset', 'access', 'reserve', 'move', 'parking', 'security', 'insight', 'intelligence'],
    organization_admin: ['property', 'people', 'finance', 'maintenance', 'documents', 'buildingpass', 'community', 'request', 'complaint', 'asset', 'access', 'reserve', 'move', 'parking', 'security', 'insight', 'intelligence'],
    building_manager: ['property', 'people', 'finance', 'maintenance', 'documents', 'buildingpass', 'community', 'request', 'complaint', 'asset', 'access', 'reserve', 'move', 'parking', 'security', 'insight'],
    finance_manager: ['finance', 'documents', 'insight', 'complaint'],
    maintenance_manager: ['request', 'asset', 'maintenance', 'property', 'documents', 'insight', 'move'],
    security_manager: ['buildingpass', 'access', 'security', 'documents', 'move', 'parking', 'insight'],
    security_officer: ['buildingpass', 'access', 'security', 'move'],
    community_manager: ['community', 'request', 'complaint', 'people', 'documents', 'insight'],
    document_manager: ['documents', 'complaint', 'insight'],
    parking_manager: ['parking', 'reserve', 'access', 'buildingpass', 'insight'],
    technician: ['request', 'maintenance', 'asset'],
    auditor: ['finance', 'documents', 'security', 'insight', 'complaint', 'request', 'maintenance', 'asset'],
  };

  const allNavItems = [
    { label: 'Visão geral', to: '/building360/dashboard', icon: LayoutDashboard },
    { label: 'Edifícios e unidades', to: workspace('property'), icon: Building2 },
    { label: 'Proprietários e inquilinos', to: workspace('people'), icon: Users },
    { label: 'Cobranças e dívidas', to: workspace('finance'), icon: Wallet },
    { label: 'Manutenção', to: workspace('maintenance'), icon: Wrench },
    { label: 'Relatórios e documentos', to: workspace('documents'), icon: FileText },
  ];
  const allowedModules = profileModules[profile] || [];
  const navItems = allNavItems.filter(({ label, to }) =>
    label === 'Visão geral' || allowedModules.includes(to.split('/').pop() || ''),
  );

  const cards = [
    { label: 'Cobranças do mês', value: unavailableData.includes('invoices') || hasOtherCurrency ? '—' : formatMzn(metrics.chargedThisPeriod), detail: `Faturas emitidas em ${periodLabel}`, icon: Wallet, color: 'text-sky-300' },
    { label: 'Recebido este mês', value: unavailableData.includes('receipts') || hasOtherCurrency ? '—' : formatMzn(metrics.collectedThisPeriod), detail: unavailableData.includes('invoices') || unavailableData.includes('receipts') || hasOtherCurrency || metrics.chargedThisPeriod === 0 ? 'Pagamentos registados em recibos' : `${metrics.collectionRate}% do valor emitido neste mês`, icon: Wallet, color: 'text-emerald-300' },
    { label: 'Em dívida este mês', value: unavailableData.includes('invoices') || unavailableData.includes('receipts') || hasOtherCurrency ? '—' : formatMzn(metrics.outstandingThisPeriod), detail: 'Faturas válidas menos recibos associados', icon: AlertCircle, color: 'text-amber-300' },
    { label: 'Pedidos abertos', value: unavailableData.includes('workOrders') ? '—' : String(metrics.openRequests), detail: 'Manutenção e reclamações por tratar', icon: ClipboardList, color: 'text-violet-300' },
    { label: 'Despesas deste mês', value: unavailableData.includes('ledger') ? '—' : formatMzn(metrics.expensesThisPeriod), detail: 'Movimentos registados no livro', icon: FileText, color: 'text-rose-300' },
    { label: 'Saldo registado no sistema', value: unavailableData.includes('ledger') || unavailableData.includes('receipts') ? '—' : formatMzn(metrics.systemBalance), detail: 'Não representa saldo bancário confirmado', icon: Wallet, color: 'text-sky-300' },
    { label: 'Recebimentos conciliados', value: unavailableData.includes('ledger') ? '—' : formatMzn(metrics.bankReconciled), detail: 'Correspondência manual com referência de extrato', icon: Wallet, color: 'text-cyan-300' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-800 bg-slate-900/70 p-5 lg:block">
          <Link to="/building360/dashboard" className="text-xl font-black text-white">Building360</Link>
          <p className="mt-1 text-xs text-slate-400">{String(user?.name || user?.nome || user?.email || 'Administrador')}</p>
          <nav className="mt-8 space-y-1">
            {navItems.map(({ label, to, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${to === '/building360/dashboard' ? 'bg-emerald-500/15 text-emerald-200' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </nav>
          <Link to="/building360" className="mt-8 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white">
            Voltar à página comercial <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-4 border-b border-slate-800 px-4 py-4 sm:px-8">
            <div>
              <p className="text-sm text-slate-400">Dashboard privado do cliente</p>
              <h1 className="text-xl font-bold text-white">Visão geral</h1>
            </div>
            <button
              type="button"
              onClick={() => {
                clearAuthSession();
                navigate('/building360/login?returnTo=%2Fbuilding360%2Fdashboard', { replace: true });
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-900"
            >
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Terminar sessão</span>
            </button>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-7 sm:px-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-white">
                  {String(user?.building360_building_name || 'A sua carteira')}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {String(user?.building360_site_name || 'Indicadores agregados da organização')}
                  {' · '}{periodLabel}
                </p>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">
                {profile.replaceAll('_', ' ')}
              </span>
            </div>

            {canConfigure && (
              <Link to="/building360/onboarding" className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-emerald-500 hover:text-white">
                Continuar configuração inicial <ArrowRight className="h-4 w-4" />
              </Link>
            )}

            {loadError && (
              <div role="alert" className="mb-5 flex gap-3 rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-100">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Alguns dados não puderam ser carregados.</p>
                  <p className="mt-1 text-amber-100/80">{loadError}</p>
                </div>
              </div>
            )}

            <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map(({ label, value, detail, icon: Icon, color }) => (
                <article key={label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">{label}</p>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <p className={`mt-4 text-2xl font-black ${color}`}>{loading ? 'A carregar…' : value}</p>
                  <p className="mt-2 text-xs text-slate-500">{detail}</p>
                </article>
              ))}
            </div>

            <div className="mb-5 grid gap-4 lg:grid-cols-3">
              <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-white">Estado da carteira</h2>
                    <p className="mt-1 text-xs text-slate-400">Dados recebidos do backend autenticado</p>
                  </div>
                  <Building2 className="h-5 w-5 text-sky-300" />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    ['Edifícios', overview?.portfolio?.buildings],
                    ['Unidades', overview?.portfolio?.units],
                    ['Saldo por cobrar', unavailableData.includes('invoices') || unavailableData.includes('receipts') || hasOtherCurrency ? '—' : formatMzn(metrics.outstandingAllPeriods)],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl bg-slate-950 p-4">
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="mt-2 font-bold text-white">{loading ? '…' : value ?? '—'}</p>
                    </div>
                  ))}
                </div>
                {hasOtherCurrency && <p className="mt-3 text-xs text-amber-200">Há registos noutra moeda que não são convertidos nem agregados neste resumo.</p>}
                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  Os valores recebidos são registos do sistema. Um recibo não confirma automaticamente
                  a entrada de fundos no banco. O saldo bancário não está ligado nem reconciliado.
                </p>
              </article>

              <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <h2 className="font-bold text-white">Atenção hoje</h2>
                <p className="mt-1 text-xs text-slate-400">Fila actual de pedidos</p>
                {loading ? (
                  <p className="mt-5 text-sm text-slate-400">A carregar pedidos…</p>
                ) : unavailableData.includes('workOrders') ? (
                  <p className="mt-5 text-sm text-amber-200">Não foi possível consultar a fila de pedidos.</p>
                ) : workOrders.filter((order) => !['done', 'cancelled'].includes(order.status)).length ? (
                  <ul className="mt-4 space-y-3">
                    {workOrders
                      .filter((order) => !['done', 'cancelled'].includes(order.status))
                      .slice(0, 4)
                      .map((order) => (
                        <li key={order.id} className="border-b border-slate-800 pb-3 last:border-0">
                          <p className="text-sm font-medium text-slate-200">{order.title}</p>
                          <p className="mt-1 text-xs text-amber-300">{order.status.replaceAll('_', ' ')}</p>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="mt-5 text-sm text-slate-400">Não há pedidos abertos registados.</p>
                )}
                <Link to={workspace('maintenance')} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-sky-300 hover:text-sky-200">
                  Abrir manutenção <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <h2 className="font-bold text-white">Acesso rápido</h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {navItems.slice(1).map(({ label, to, icon: Icon }) => (
                    <Link key={label} to={to} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-3 text-sm text-slate-300 hover:border-sky-700 hover:text-white">
                      <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-sky-300" />{label}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                    </Link>
                  ))}
                </div>
              </article>

              <article className="rounded-2xl border border-amber-700/30 bg-amber-950/10 p-5">
                <h2 className="font-bold text-amber-100">Limites actuais dos dados</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
                  <li>A cobrança mensal soma faturas válidas emitidas neste mês.</li>
                  <li>A dívida inclui faturas válidas (incluindo dívida histórica faturada) menos recibos associados, sem ficar abaixo de zero.</li>
                  <li>Despesas e saldo inicial são registos do livro; referências de comprovativos não fazem upload de ficheiros.</li>
                  <li>A conciliação é manual contra uma referência do extrato; não há ligação automática ao banco.</li>
                  <li>Convites e activação de utilizadores ainda não estão disponíveis neste fluxo.</li>
                </ul>
                <Link to="/building360/blueprint" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-amber-200 hover:text-white">
                  Ver estado técnico <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Building360DashboardPage;
