import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { withTimeout } from '@/lib/networkPerformance';
import {
  ArrowRight,
  Building2,
  ShieldCheck,
  Wrench,
  Wallet,
  Users,
  FileText,
  Activity,
  Car,
  Bot,
  BarChart3,
  Fingerprint,
  CalendarClock,
  Sparkles,
  MessageSquare,
  Bell,
  ClipboardList,
  AlertTriangle,
  CalendarCheck2,
  Truck,
} from 'lucide-react';

type Building360Overview = {
  tenantId?: string;
  portfolio?: {
    sites?: number;
    buildings?: number;
    units?: number;
  };
  operations?: {
    assets?: number;
    workOrdersOpen?: number;
    workOrdersDone?: number;
  };
  maintenance?: {
    criticalAssets?: number;
    warningAssets?: number;
  };
  generatedAt?: string;
};

type Building360Site = {
  id: string;
  name: string;
  city: string;
  type: string;
};

type Building360Building = {
  id: string;
  siteId: string;
  name: string;
  floors: number;
};

type Building360Unit = {
  id: string;
  siteId: string;
  buildingId: string;
  number: string;
  type: string;
  status: string;
  areaM2: number;
};

type ModuleItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
};

type TimePeriod = 'today' | 'this_week' | 'this_month' | 'this_quarter';

const PERIOD_LABELS: Record<TimePeriod, string> = {
  today: 'Hoje',
  this_week: 'Esta semana',
  this_month: 'Este mes',
  this_quarter: 'Este trimestre',
};

const modules: ModuleItem[] = [
  {
    key: 'property',
    title: 'Property Management',
    subtitle: 'Sites, edificios, pisos, unidades e areas comuns',
    icon: <Building2 className="w-6 h-6" />,
    gradient: 'from-sky-600 to-cyan-500',
  },
  {
    key: 'buildingpass',
    title: 'BuildingPass',
    subtitle: 'Identidade digital, credenciais e validacao de visitantes',
    icon: <Fingerprint className="w-6 h-6" />,
    gradient: 'from-indigo-600 to-violet-600',
  },
  {
    key: 'community',
    title: 'Community360',
    subtitle: 'Avisos, comunicados e notificacoes segmentadas',
    icon: <Bell className="w-6 h-6" />,
    gradient: 'from-cyan-600 to-sky-500',
  },
  {
    key: 'chat',
    title: 'Chat360',
    subtitle: 'Conversas operacionais com conversao para tickets',
    icon: <MessageSquare className="w-6 h-6" />,
    gradient: 'from-blue-600 to-indigo-500',
  },
  {
    key: 'request',
    title: 'Request360',
    subtitle: 'Solicitacoes, triagem, atribuicao e SLA',
    icon: <ClipboardList className="w-6 h-6" />,
    gradient: 'from-emerald-600 to-teal-500',
  },
  {
    key: 'complaint',
    title: 'Complaint360',
    subtitle: 'Reclamacoes com evidencias e trilha de auditoria',
    icon: <AlertTriangle className="w-6 h-6" />,
    gradient: 'from-rose-600 to-red-500',
  },
  {
    key: 'finance',
    title: 'Finance360',
    subtitle: 'Receitas, despesas, cobrancas, pagamentos e orcamento',
    icon: <Wallet className="w-6 h-6" />,
    gradient: 'from-emerald-600 to-lime-500',
  },
  {
    key: 'asset',
    title: 'Asset360',
    subtitle: 'Inventario tecnico e ciclo de vida de activos',
    icon: <Wrench className="w-6 h-6" />,
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    key: 'maintenance',
    title: 'Maintain360',
    subtitle: 'Ordens de trabalho, manutencao preventiva e corretiva',
    icon: <Wrench className="w-6 h-6" />,
    gradient: 'from-amber-600 to-yellow-500',
  },
  {
    key: 'access',
    title: 'Access Control',
    subtitle: 'Politicas de acesso por zona e horario',
    icon: <ShieldCheck className="w-6 h-6" />,
    gradient: 'from-indigo-700 to-sky-600',
  },
  {
    key: 'people',
    title: 'People & Community',
    subtitle: 'Pessoas, organizacoes, comunicacao e governance',
    icon: <Users className="w-6 h-6" />,
    gradient: 'from-fuchsia-600 to-rose-600',
  },
  {
    key: 'reserve',
    title: 'Reserve360',
    subtitle: 'Reservas de espacos comuns e validacao de regras',
    icon: <CalendarCheck2 className="w-6 h-6" />,
    gradient: 'from-lime-600 to-emerald-500',
  },
  {
    key: 'move',
    title: 'Move360',
    subtitle: 'Mudancas com aprovacao e coordenacao de seguranca',
    icon: <Truck className="w-6 h-6" />,
    gradient: 'from-orange-600 to-amber-500',
  },
  {
    key: 'documents',
    title: 'Document360',
    subtitle: 'Contratos, licencas, certificacoes e historico',
    icon: <FileText className="w-6 h-6" />,
    gradient: 'from-slate-700 to-slate-500',
  },
  {
    key: 'parking',
    title: 'Parking360',
    subtitle: 'Espacos, viaturas, reservas e visitantes',
    icon: <Car className="w-6 h-6" />,
    gradient: 'from-teal-600 to-emerald-500',
  },
  {
    key: 'insight',
    title: 'Insight360',
    subtitle: 'Indicadores, analitica operacional e BI',
    icon: <BarChart3 className="w-6 h-6" />,
    gradient: 'from-red-600 to-orange-500',
  },
  {
    key: 'intelligence',
    title: 'Building Intelligence',
    subtitle: 'Assistente IA para custos, riscos e previsoes',
    icon: <Bot className="w-6 h-6" />,
    gradient: 'from-purple-700 to-indigo-600',
  },
  {
    key: 'security',
    title: 'Security360',
    subtitle: 'Ocorrencias, emergency mode e auditoria critica',
    icon: <ShieldCheck className="w-6 h-6" />,
    gradient: 'from-blue-700 to-sky-600',
  },
];

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

const resolveAuthToken = (): string => {
  return String(localStorage.getItem('eduguard_token') || localStorage.getItem('token') || '').trim();
};

const hasAuthToken = (): boolean => resolveAuthToken().length > 0;

const BUILDING360_ROLE_ALIASES: Record<string, string> = {
  super_admin: 'platform_admin',
  admin: 'platform_admin',
  administrator: 'organization_admin',
  director: 'organization_admin',
  diretor: 'organization_admin',
  financeiro: 'finance_manager',
  maintenance: 'maintenance_manager',
  seguranca: 'security_officer',
  security: 'security_officer',
  scanner: 'security_officer',
};

const resolveBuilding360Profile = (value: unknown): string => {
  const normalized = String(value || '').trim().toLowerCase();
  return BUILDING360_ROLE_ALIASES[normalized] || normalized || 'organization_admin';
};

const buildHeaders = (currentUser: any): HeadersInit => ({
  ...(hasAuthToken()
    ? { Authorization: `Bearer ${resolveAuthToken()}` }
    : {}),
  'Content-Type': 'application/json',
  'x-enterprise-role': String(currentUser?.perfil || currentUser?.role || ''),
  'x-user-id': String(currentUser?.id || currentUser?.user_id || ''),
  'x-school-id': String(currentUser?.escola_id || currentUser?.school_id || currentUser?.tenant_id || ''),
  'x-tenant-id': String(currentUser?.tenant_id || currentUser?.escola_id || currentUser?.school_id || ''),
});

const getApiBaseCandidates = (): string[] => {
  return [''];
};

const composeEndpoint = (base: string, path: string): string => {
  if (!base) return path;
  return `${base}${path}`;
};

const Building360PortalPage: React.FC = () => {
  const navigate = useNavigate();
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [overview, setOverview] = useState<Building360Overview | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [sites, setSites] = useState<Building360Site[]>([]);
  const [buildings, setBuildings] = useState<Building360Building[]>([]);
  const [units, setUnits] = useState<Building360Unit[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedUnitType, setSelectedUnitType] = useState('');
  const [selectedUnitStatus, setSelectedUnitStatus] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('this_month');
  const operationsRef = useRef<HTMLElement | null>(null);

  const fetchWithFallback = async (
    securePath: string,
    publicPath: string,
    currentUser: any,
    timeoutLabel: string
  ): Promise<Response> => {
    const prioritizedPaths = [securePath, publicPath];
    const headers = buildHeaders(currentUser);
    const bases = getApiBaseCandidates();
    let lastError: unknown = null;

    for (const path of prioritizedPaths) {
      for (const base of bases) {
        const endpoint = composeEndpoint(base, path);
        try {
          const response = await withTimeout(fetch(endpoint, { headers }), 10000, timeoutLabel);
          if (!response.ok) {
            lastError = new Error(`HTTP ${response.status} ${endpoint}`);
            continue;
          }
          return response;
        } catch (error) {
          lastError = error;
        }
      }
    }

    throw lastError || new Error('No Building360 endpoint available');
  };

  const openModuleWorkspace = (moduleKey: string) => {
    const currentUser = resolveCurrentUserSnapshot();
    const profile = resolveBuilding360Profile(currentUser?.perfil || currentUser?.role || 'organization_admin');
    navigate(`/building360/workspace/${profile}/${moduleKey}`);
  };

  useEffect(() => {
    const loadOverview = async () => {
      setLoadingMetrics(true);
      setMetricsError(null);

      try {
        const currentUser = resolveCurrentUserSnapshot();
        const response = await fetchWithFallback(
          '/api/v1/building360/overview',
          '/api/v1/building360/public/overview',
          currentUser,
          'Building360 overview timeout'
        );

        const data = await response.json();
        setOverview(data);
      } catch (error) {
        console.warn('Building360 API unavailable. Showing fallback metrics.', error);
        setMetricsError('Sem ligação API no momento. A mostrar baseline operacional.');
      } finally {
        setLoadingMetrics(false);
      }
    };

    loadOverview();
  }, []);

  useEffect(() => {
    const loadSites = async () => {
      setLoadingPortfolio(true);
      setPortfolioError(null);

      try {
        const currentUser = resolveCurrentUserSnapshot();
        const response = await fetchWithFallback(
          '/api/v1/building360/sites',
          '/api/v1/building360/public/sites',
          currentUser,
          'Building360 sites timeout'
        );

        const data = (await response.json()) as Building360Site[];
        setSites(Array.isArray(data) ? data : []);
        setSelectedSiteId((prev) => prev || data?.[0]?.id || '');
      } catch (error) {
        console.warn('Building360 site list unavailable.', error);
        setPortfolioError('Nao foi possivel carregar portfolio operacional agora.');
      } finally {
        setLoadingPortfolio(false);
      }
    };

    loadSites();
  }, []);

  useEffect(() => {
    const loadBuildings = async () => {
      if (!selectedSiteId) {
        setBuildings([]);
        setSelectedBuildingId('');
        return;
      }

      try {
        const currentUser = resolveCurrentUserSnapshot();
        const response = await fetchWithFallback(
          `/api/v1/building360/buildings?siteId=${encodeURIComponent(selectedSiteId)}`,
          `/api/v1/building360/public/buildings?siteId=${encodeURIComponent(selectedSiteId)}`,
          currentUser,
          'Building360 buildings timeout'
        );

        const data = (await response.json()) as Building360Building[];
        const list = Array.isArray(data) ? data : [];
        setBuildings(list);
        setSelectedBuildingId((prev) => {
          if (!prev) return list[0]?.id || '';
          return list.some((item) => item.id === prev) ? prev : list[0]?.id || '';
        });
      } catch (error) {
        console.warn('Building360 building list unavailable.', error);
        setBuildings([]);
        setSelectedBuildingId('');
      }
    };

    loadBuildings();
  }, [selectedSiteId]);

  useEffect(() => {
    const loadUnits = async () => {
      if (!selectedSiteId) {
        setUnits([]);
        return;
      }

      try {
        const currentUser = resolveCurrentUserSnapshot();
        const params = new URLSearchParams();
        params.set('siteId', selectedSiteId);
        if (selectedBuildingId) params.set('buildingId', selectedBuildingId);
        if (selectedUnitType) params.set('type', selectedUnitType);
        if (selectedUnitStatus) params.set('status', selectedUnitStatus);

        const response = await fetchWithFallback(
          `/api/v1/building360/units?${params.toString()}`,
          `/api/v1/building360/public/units?${params.toString()}`,
          currentUser,
          'Building360 units timeout'
        );

        const data = (await response.json()) as Building360Unit[];
        setUnits(Array.isArray(data) ? data : []);
      } catch (error) {
        console.warn('Building360 unit list unavailable.', error);
        setUnits([]);
      }
    };

    loadUnits();
  }, [selectedSiteId, selectedBuildingId, selectedUnitType, selectedUnitStatus]);

  const portfolio = overview?.portfolio;
  const operations = overview?.operations;
  const maintenance = overview?.maintenance;
  const workOrdersOpen = operations?.workOrdersOpen ?? 0;
  const workOrdersDone = operations?.workOrdersDone ?? 0;
  const warningAssets = maintenance?.warningAssets ?? 0;
  const criticalAssets = maintenance?.criticalAssets ?? 0;

  const topCards = useMemo(
    () => [
      {
        label: 'Sites Activos',
        value: portfolio?.sites ?? 0,
        subtitle: 'Sites operacionais no tenant actual',
      },
      {
        label: 'Unidades',
        value: portfolio?.units ?? 0,
        subtitle: 'Unidades e espacos sob gestao',
      },
      {
        label: 'Ordens Abertas',
        value: workOrdersOpen,
        subtitle: 'Ordens de manutencao em curso',
      },
      {
        label: 'Risco de Activos',
        value: `${criticalAssets}/${warningAssets}`,
        subtitle: 'Criticos vs alertas preventivos',
      },
    ],
    [criticalAssets, portfolio?.sites, portfolio?.units, warningAssets, workOrdersOpen]
  );

  const moduleLiveData: Record<string, string> = {
    property: `${portfolio?.sites ?? 0} sites · ${portfolio?.buildings ?? 0} edificios`,
    buildingpass: `${operations?.assets ?? 0} credenciais e dispositivos monitorados`,
    community: `${portfolio?.units ?? 0} unidades elegiveis para comunicados`,
    chat: `${workOrdersOpen} conversas operacionais activas`,
    request: `${workOrdersOpen} solicitacoes em tratamento`,
    complaint: `${warningAssets + criticalAssets} reclamacoes e alertas auditaveis`,
    finance: `${workOrdersDone} ordens encerradas para fecho financeiro`,
    asset: `${operations?.assets ?? 0} activos inventariados`,
    maintenance: `${workOrdersOpen} ordens activas`,
    access: `${portfolio?.buildings ?? 0} edificios com politicas de acesso`,
    people: `${portfolio?.units ?? 0} unidades com actividade`,
    reserve: `${portfolio?.units ?? 0} espacos sob regras de reserva`,
    move: `${workOrdersOpen} processos de mudanca em coordenacao`,
    documents: `${workOrdersDone} registos de operacao concluidos`,
    parking: `${warningAssets} activos em alerta`,
    insight: `${operations?.assets ?? 0} sinais no painel analitico`,
    intelligence: `${criticalAssets} activos criticos para decisao`,
    security: `${warningAssets + criticalAssets} alertas operacionais totais`,
  };

  const selectedSite = sites.find((item) => item.id === selectedSiteId);
  const selectedBuilding = buildings.find((item) => item.id === selectedBuildingId);
  const currentUser = resolveCurrentUserSnapshot();
  const activeTenantLabel = String(currentUser?.tenant_id || currentUser?.escola_id || overview?.tenantId || 'tenant-demo-1');
  const totalUnits = units.length;
  const occupiedUnits = units.filter((item) => item.status === 'occupied').length;
  const vacantUnits = units.filter((item) => item.status === 'vacant').length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_45%),radial-gradient(circle_at_20%_80%,_rgba(16,185,129,0.16),_transparent_40%)] pointer-events-none" />

      <header className="relative z-10 border-b border-slate-800/80 backdrop-blur-sm bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/portais')}
            className="text-slate-300 hover:text-white font-medium"
          >
            Voltar aos portais
          </button>
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-slate-800 border border-slate-700 text-xs uppercase tracking-widest text-sky-300">
            <Activity className="w-3 h-3" />
            Building360 Core
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <p className="text-sky-300 uppercase text-xs tracking-[0.22em] mb-4">Plataforma operacional integrada</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight text-white">
              Building360
            </h1>
            <p className="mt-6 text-lg text-slate-300 max-w-2xl">
              A infraestrutura digital para gerir edificios, instalacoes e comunidades em um unico ecossistema:
              pessoas, activos, seguranca, financas e manutencao.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/portais')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-bold hover:shadow-xl hover:shadow-sky-600/30 transition-all"
              >
                Explorar Portais
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => operationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-900 transition-colors"
              >
                Abrir Operacao Building360
              </button>
              <Link
                to="/building360/blueprint"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-sky-600/50 text-sky-300 hover:bg-sky-900/20 transition-colors"
              >
                Blueprint V1
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="mt-6 rounded-xl border border-cyan-700/40 bg-cyan-900/10 p-4 text-sm text-cyan-100">
              Building360 e um produto independente no ecossistema: partilha identidade e seguranca, mas nao depende do workspace escolar para operar.
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl shadow-sky-900/20">
            <h2 className="text-xl font-bold text-white mb-6">Painel Building360 Core</h2>
            {metricsError && (
              <p className="mb-4 text-xs text-amber-300 bg-amber-950/40 border border-amber-700/50 rounded-lg px-3 py-2">
                {metricsError}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {topCards.map((card) => (
                <div key={card.label} className="rounded-xl bg-slate-800/90 p-4 border border-slate-700">
                  <p className="text-slate-400">{card.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {loadingMetrics ? '...' : card.value}
                  </p>
                  <p className="text-slate-300 text-xs mt-1">{card.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={operationsRef} className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-white">Contexto Operacional</h2>
              <p className="mt-1 text-sm text-slate-300">
                Organizacao, site, edificio e periodo definem o escopo operacional do painel Building360.
              </p>
            </div>
            <div className="text-xs text-slate-400">Tenant activo: {activeTenantLabel}</div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <label className="text-xs text-slate-300">
              Organizacao
              <select
                value={activeTenantLabel}
                disabled
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3 py-2"
              >
                <option value={activeTenantLabel}>{activeTenantLabel}</option>
              </select>
            </label>

            <label className="text-xs text-slate-300">
              Site
              <select
                value={selectedSiteId}
                onChange={(event) => setSelectedSiteId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3 py-2"
              >
                <option value="">Todos os sites</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-300">
              Edificio
              <select
                value={selectedBuildingId}
                onChange={(event) => setSelectedBuildingId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3 py-2"
              >
                <option value="">Todos os edificios</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-300">
              Periodo
              <select
                value={selectedPeriod}
                onChange={(event) => setSelectedPeriod(event.target.value as TimePeriod)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3 py-2"
              >
                {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <p className="text-slate-400">Taxa de ocupacao</p>
              <p className="mt-1 text-lg font-bold text-emerald-300">{occupancyRate}%</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <p className="text-slate-400">Unidades ocupadas</p>
              <p className="mt-1 text-lg font-bold text-white">{occupiedUnits}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <p className="text-slate-400">Unidades vagas</p>
              <p className="mt-1 text-lg font-bold text-white">{vacantUnits}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <p className="text-slate-400">Periodo</p>
              <p className="mt-1 text-lg font-bold text-sky-300">{PERIOD_LABELS[selectedPeriod]}</p>
            </div>
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{modules.length} Modulos Principais</h2>
            <p className="text-sm text-slate-400">Um core, multiplos modos de negocio</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {modules.map((module) => (
              <article
                key={module.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 transition-colors p-5 cursor-pointer"
                onClick={() => openModuleWorkspace(module.key)}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${module.gradient} flex items-center justify-center text-white mb-4`}>
                  {module.icon}
                </div>
                <h3 className="text-lg font-bold text-white">{module.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{module.subtitle}</p>
                <p className="mt-3 text-xs text-sky-300 inline-flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  {loadingMetrics ? 'A sincronizar dados...' : moduleLiveData[module.key]}
                </p>
                <p className="mt-3 text-xs text-emerald-300">Abrir workspace do modulo</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16 sm:mt-20 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-7">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Portfolio Operacional Live</h2>
              <p className="mt-2 text-sm text-slate-300">
                Filtros reais de sites, edificios e unidades com dados vindos do modulo Building360.
              </p>
            </div>
            <div className="text-xs text-slate-400">
              {loadingPortfolio ? 'A carregar portfolio...' : `${sites.length} site(s) | ${buildings.length} edificio(s) | ${units.length} unidade(s)`}
            </div>
          </div>

          {portfolioError && (
            <p className="mt-4 text-xs text-amber-300 bg-amber-950/40 border border-amber-700/50 rounded-lg px-3 py-2">
              {portfolioError}
            </p>
          )}

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <label className="text-xs text-slate-300">
              Site
              <select
                value={selectedSiteId}
                onChange={(event) => setSelectedSiteId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3 py-2"
              >
                <option value="">Todos os sites</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>{site.name}</option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-300">
              Edificio
              <select
                value={selectedBuildingId}
                onChange={(event) => setSelectedBuildingId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3 py-2"
              >
                <option value="">Todos os edificios</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>{building.name}</option>
                ))}
              </select>
            </label>

            <label className="text-xs text-slate-300">
              Tipo de Unidade
              <select
                value={selectedUnitType}
                onChange={(event) => setSelectedUnitType(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3 py-2"
              >
                <option value="">Todos os tipos</option>
                <option value="apartment">apartment</option>
                <option value="office">office</option>
                <option value="shop">shop</option>
                <option value="room">room</option>
                <option value="warehouse">warehouse</option>
                <option value="parking">parking</option>
              </select>
            </label>

            <label className="text-xs text-slate-300">
              Estado
              <select
                value={selectedUnitStatus}
                onChange={(event) => setSelectedUnitStatus(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 text-slate-100 px-3 py-2"
              >
                <option value="">Todos os estados</option>
                <option value="occupied">occupied</option>
                <option value="vacant">vacant</option>
                <option value="maintenance">maintenance</option>
              </select>
            </label>
          </div>

          <div className="mt-5 rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-900/90 text-slate-300 border-b border-slate-800">
                <tr>
                  <th className="text-left px-4 py-3">Unidade</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Area (m2)</th>
                  <th className="text-left px-4 py-3">Edificio</th>
                  <th className="text-left px-4 py-3">Site</th>
                </tr>
              </thead>
              <tbody>
                {units.map((unit) => (
                  <tr key={unit.id} className="border-b border-slate-800/70 text-slate-200">
                    <td className="px-4 py-3 font-semibold">{unit.number}</td>
                    <td className="px-4 py-3">{unit.type}</td>
                    <td className="px-4 py-3">{unit.status}</td>
                    <td className="px-4 py-3">{unit.areaM2}</td>
                    <td className="px-4 py-3">{buildings.find((building) => building.id === unit.buildingId)?.name || '-'}</td>
                    <td className="px-4 py-3">{sites.find((site) => site.id === unit.siteId)?.name || '-'}</td>
                  </tr>
                ))}
                {!loadingPortfolio && units.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={6}>Sem unidades para os filtros actuais.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {(selectedSite || selectedBuilding) && (
            <p className="mt-4 text-xs text-slate-400">
              Escopo actual: {selectedSite ? `${selectedSite.name} (${selectedSite.city})` : 'Todos os sites'}
              {selectedBuilding ? ` -> ${selectedBuilding.name}` : ''}
            </p>
          )}
        </section>

        <section className="mt-16 sm:mt-20 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Hierarquia Unificada</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              ORGANIZACAO → PORTFOLIO → SITE/COMPLEXO → EDIFICIO → PISO → UNIDADE/ESPACO → SALA/AREA.
              A mesma base suporta residencial, comercial, hospitality, campus e business park.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Modelo V1 de Lancamento</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Core + Finance + Operations + Security + Communication + Governance, com arquitectura multi-tenant,
              RBAC, audit log e isolamento por tenant_id desde o inicio.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="/#adesao"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-sky-500 text-slate-950 font-semibold"
              >
                <CalendarClock className="w-4 h-4" />
                Solicitar Demonstracao
              </a>
              <a
                href="mailto:admin@eduguard360.co.mz?subject=Pedido%20Comercial%20Building360"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                Contacto Comercial
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Building360PortalPage;
