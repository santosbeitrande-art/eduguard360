import React, { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';

type EnterpriseOverview = {
  audit?: {
    totalToday?: number;
  };
  sessions?: {
    active?: number;
    total?: number;
  };
  security?: {
    mfa?: {
      verified?: number;
      total?: number;
    };
  };
  workflows?: {
    summary?: {
      total?: number;
      byStatus?: Record<string, number>;
    };
  };
};

type ModuleItem = {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
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
    key: 'finance',
    title: 'Finance360',
    subtitle: 'Receitas, despesas, cobrancas, pagamentos e orcamento',
    icon: <Wallet className="w-6 h-6" />,
    gradient: 'from-emerald-600 to-lime-500',
  },
  {
    key: 'maintenance',
    title: 'Asset360 & Maintain360',
    subtitle: 'Activos, ordens de trabalho e manutencao preventiva',
    icon: <Wrench className="w-6 h-6" />,
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    key: 'access',
    title: 'BuildingPass',
    subtitle: 'Identidade digital, visitantes, acessos e politicas',
    icon: <Fingerprint className="w-6 h-6" />,
    gradient: 'from-indigo-600 to-violet-600',
  },
  {
    key: 'people',
    title: 'People & Community',
    subtitle: 'Pessoas, organizacoes, comunicacao e governance',
    icon: <Users className="w-6 h-6" />,
    gradient: 'from-fuchsia-600 to-rose-600',
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
    title: 'Security & Incident',
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

const buildHeaders = (currentUser: any): HeadersInit => ({
  'Content-Type': 'application/json',
  'x-enterprise-role': String(currentUser?.perfil || currentUser?.role || ''),
  'x-user-id': String(currentUser?.id || currentUser?.user_id || ''),
  'x-school-id': String(currentUser?.escola_id || currentUser?.school_id || currentUser?.tenant_id || ''),
  'x-tenant-id': String(currentUser?.tenant_id || currentUser?.escola_id || currentUser?.school_id || ''),
});

const Building360PortalPage: React.FC = () => {
  const navigate = useNavigate();
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [overview, setOverview] = useState<EnterpriseOverview | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    const loadOverview = async () => {
      setLoadingMetrics(true);
      setMetricsError(null);

      try {
        const currentUser = resolveCurrentUserSnapshot();
        const headers = currentUser ? buildHeaders(currentUser) : { 'Content-Type': 'application/json' };
        const response = await withTimeout(
          fetch('/api/v1/enterprise/overview', { headers }),
          10000,
          'Building360 overview timeout'
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

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

  const workflowStatus = overview?.workflows?.summary?.byStatus || {};
  const openWorkflows = (workflowStatus.in_review || 0) + (workflowStatus.pending || 0);

  const topCards = useMemo(
    () => [
      {
        label: 'Eventos Hoje',
        value: overview?.audit?.totalToday ?? 0,
        subtitle: 'Eventos de auditoria e actividade operacional',
      },
      {
        label: 'Sessoes Activas',
        value: overview?.sessions?.active ?? 0,
        subtitle: 'Utilizadores activos neste momento',
      },
      {
        label: 'Workflows Abertos',
        value: openWorkflows,
        subtitle: 'Fluxos pendentes e em revisao',
      },
      {
        label: 'MFA Verificado',
        value: `${overview?.security?.mfa?.verified ?? 0}/${overview?.security?.mfa?.total ?? 0}`,
        subtitle: 'Dispositivos e contas protegidas',
      },
    ],
    [overview, openWorkflows]
  );

  const moduleLiveData: Record<string, string> = {
    property: `${overview?.sessions?.total ?? 0} sessoes acumuladas`,
    finance: `${overview?.audit?.totalToday ?? 0} eventos financeiros/auditoria hoje`,
    maintenance: `${openWorkflows} fluxos activos`,
    access: `${overview?.sessions?.active ?? 0} acessos activos`,
    people: `${overview?.sessions?.total ?? 0} registos de sessao`,
    documents: `${workflowStatus.completed || 0} aprovacoes concluidas`,
    parking: `${workflowStatus.pending || 0} pendencias operacionais`,
    insight: `${overview?.audit?.totalToday ?? 0} pontos no painel analitico`,
    intelligence: `${workflowStatus.in_review || 0} alertas para decisao`,
    security: `${overview?.security?.mfa?.verified ?? 0} contas com MFA`,
  };

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
                onClick={() => navigate('/enterprise')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-900 transition-colors"
              >
                Abrir Enterprise
              </button>
              <Link
                to="/building360/blueprint"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-sky-600/50 text-sky-300 hover:bg-sky-900/20 transition-colors"
              >
                Blueprint V1
                <ArrowRight className="w-5 h-5" />
              </Link>
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

        <section className="mt-16 sm:mt-20">
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">10 Modulos Principais</h2>
            <p className="text-sm text-slate-400">Um core, multiplos modos de negocio</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {modules.map((module) => (
              <article
                key={module.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 transition-colors p-5"
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
              </article>
            ))}
          </div>
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
