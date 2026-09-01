import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import {
  BookOpen,
  Building2,
  Shield,
  ArrowRight,
  Users,
  Lock,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  UserCircle2,
  LogIn,
  ShieldAlert,
  BarChart3,
  ShoppingBag,
  FileSearch,
  RefreshCw,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Tipos
───────────────────────────────────────────── */
interface UserSnapshot {
  id?: string;
  nome?: string;
  name?: string;
  email?: string;
  perfil?: string;
  role?: string;
  escola_id?: string;
  school_id?: string;
  tenant_id?: string;
}

interface PortalAccessEntry {
  access: 'full' | 'restricted' | 'none';
  canOpen: boolean;
  role: string | null;
  roleLabel: string | null;
  organizationId?: string | null;
}

interface AccessiblePortal {
  id: string;
  role: string | null;
  roleLabel: string | null;
  organizationId: string | null;
}

interface CoreIdentity {
  userId: string | null;
  email: string | null;
  name: string | null;
  role: string;
  roleLabel: string;
  organizationId: string | null;
  tenantId: string | null;
  sessionValid: boolean | null;
}

interface CoreResponse {
  identity: CoreIdentity;
  memberships: Record<string, PortalAccessEntry>;
  portals?: Record<string, PortalAccessEntry>; // legacy compat
  accessiblePortals: AccessiblePortal[];
  permissions: Record<string, string[]>;
  meta: { resolvedAt: string; source: string };
}

interface PortalDef {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  external?: boolean;
  /** Fallback when Core is unreachable */
  allowedRoles: string[];
  restrictedRoles?: string[];
}

type AccessLevel = 'full' | 'restricted' | 'none' | 'guest';

/* ─────────────────────────────────────────────
   Utilitários locais (fallback sem Core)
───────────────────────────────────────────── */
const resolveUser = (): UserSnapshot | null => {
  for (const key of ['currentUser', 'eduguard_user', 'user']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch { continue; }
  }
  return null;
};

const resolveToken = (): string | null =>
  localStorage.getItem('eduguard_token') || localStorage.getItem('token') || null;

const normalizeRole = (role?: string): string =>
  String(role || '').trim().toLowerCase()
    .replace('diretor', 'director')
    .replace('administrador', 'administrator')
    .replace('segurança', 'seguranca');

/* ─────────────────────────────────────────────
   Catálogo de portais
───────────────────────────────────────────── */
const PORTALS: PortalDef[] = [
  {
    id: 'security',
    name: 'School Security',
    subtitle: 'EduGuard Security',
    description: 'Controlo de acessos, presença e segurança da comunidade escolar com QR codes e alertas em tempo real.',
    icon: <Shield className="w-8 h-8" />,
    color: 'from-blue-600 to-blue-700',
    route: '/sistema',
    allowedRoles: ['super_admin', 'admin', 'seguranca'],
    restrictedRoles: ['parent', 'guardian', 'student'],
  },
  {
    id: 'building360',
    name: 'Building360',
    subtitle: 'Gestão de Edifícios',
    description: 'Plataforma operacional para edifícios, instalações e comunidades. Finance, Assets, Manutenção e Acessos.',
    icon: <Building2 className="w-8 h-8" />,
    color: 'from-sky-600 to-emerald-600',
    route: '/building360',
    allowedRoles: ['super_admin', 'admin', 'director', 'administrator'],
    restrictedRoles: ['secretaria', 'financeiro'],
  },
  {
    id: 'edumarket',
    name: 'EduMarket',
    subtitle: 'Marketplace Educacional',
    description: 'Crie e venda cursos e serviços profissionais. Pagamentos M-Pesa integrados e dashboard de ganhos.',
    icon: <ShoppingBag className="w-8 h-8" />,
    color: 'from-purple-600 to-indigo-600',
    route: '/edumarket',
    allowedRoles: ['super_admin', 'admin', 'professor', 'teacher', 'administrator'],
    restrictedRoles: ['student', 'parent'],
  },
  {
    id: 'verify-ai',
    name: 'Verify AI',
    subtitle: 'Verificação Documental',
    description: 'Verificação inteligente de autenticidade de documentos para entidades empresariais e académicas.',
    icon: <FileSearch className="w-8 h-8" />,
    color: 'from-cyan-600 to-sky-700',
    route: '/public/login',
    external: true,
    allowedRoles: ['super_admin', 'admin', 'administrator'],
  },
  {
    id: 'literature',
    name: 'Open Literature',
    subtitle: 'Biblioteca Aberta',
    description: 'Aceda livros, artigos e publicações abertas. Open Library, Project Gutenberg e conteúdo moçambicano.',
    icon: <BookOpen className="w-8 h-8" />,
    color: 'from-amber-500 to-orange-500',
    route: '/literatura',
    allowedRoles: ['super_admin', 'admin', 'director', 'professor', 'secretaria', 'financeiro', 'administrator', 'student', 'parent'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Gestão Institucional',
    description: 'Portal administrativo completo: notas, currículos, turmas, calendário académico e relatórios pedagógicos.',
    icon: <Users className="w-8 h-8" />,
    color: 'from-green-600 to-emerald-600',
    route: '/enterprise',
    allowedRoles: ['super_admin', 'admin', 'director', 'administrator', 'secretaria', 'coordenador', 'professor', 'financeiro', 'rh'],
  },
  {
    id: 'analytics',
    name: 'Analytics',
    subtitle: 'Análise de Dados',
    description: 'Análise avançada de dados educacionais. Tendências, previsões, dashboards executivos e exportação.',
    icon: <BarChart3 className="w-8 h-8" />,
    color: 'from-orange-600 to-red-600',
    route: '/analytics',
    allowedRoles: ['super_admin', 'admin', 'director', 'administrator'],
    restrictedRoles: ['financeiro', 'secretaria'],
  },
];

/* ─────────────────────────────────────────────
   Tipos
───────────────────────────────────────────── */
interface UserSnapshot {
  id?: string;
  nome?: string;
  name?: string;
  email?: string;
  perfil?: string;
  role?: string;
  escola_id?: string;
  school_id?: string;
  tenant_id?: string;
}

/* ─────────────────────────────────────────────
   Componente principal
───────────────────────────────────────────── */
const EducuardPortalHub: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [user, setUser] = useState<UserSnapshot | null>(null);
  const [coreData, setCoreData] = useState<CoreResponse | null>(null);
  const [coreLoading, setCoreLoading] = useState(false);
  const [coreError, setCoreError] = useState(false);

  /* ── Load local snapshot ── */
  useEffect(() => {
    setUser(resolveUser());
  }, []);

  /* ── Call EduGuard Core identity endpoint ── */
  useEffect(() => {
    const token = resolveToken();
    const localUser = resolveUser();
    if (!localUser) return;

    setCoreLoading(true);
    setCoreError(false);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-enterprise-role': String(localUser.perfil || localUser.role || ''),
      'x-school-id': String(localUser.escola_id || localUser.school_id || localUser.tenant_id || ''),
      'x-tenant-id': String(localUser.tenant_id || localUser.escola_id || localUser.school_id || ''),
      'x-user-id': String(localUser.id || ''),
      'x-user-name': String(localUser.nome || localUser.name || localUser.email || ''),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch('/api/v1/core?action=identity', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: localUser.id,
        email: localUser.email,
        name: localUser.nome || localUser.name,
      }),
      signal: controller.signal,
    })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: CoreResponse) => setCoreData(data))
      .catch(() => setCoreError(true))
      .finally(() => { clearTimeout(timeout); setCoreLoading(false); });

    return () => { clearTimeout(timeout); controller.abort(); };
  }, []);

  /* ── Log audit event for portal open ── */
  const logAudit = (portalId: string, action: 'portal_open' | 'portal_denied') => {
    const token = resolveToken();
    const localUser = resolveUser();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (localUser) {
      headers['x-enterprise-role'] = String(localUser.perfil || localUser.role || '');
      headers['x-user-id'] = String(localUser.id || '');
    }
    fetch('/api/v1/core?action=audit', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action,
        portal: portalId,
        userId: localUser?.id,
        resourceType: 'portal',
        resourceId: portalId,
      }),
    }).catch(() => { /* audit failures are non-blocking */ });
  };

  /* ── Derived identity ── */
  const identity = coreData?.identity ?? null;
  const displayName = identity?.name ?? user?.nome ?? user?.name ?? user?.email?.split('@')[0] ?? null;
  const displayEmail = identity?.email ?? user?.email ?? null;
  const activeRole = identity?.role ?? normalizeRole(user?.perfil ?? user?.role ?? '');
  const roleLabel = identity?.roleLabel ?? activeRole;

  const getAccess = (portal: PortalDef): AccessLevel => {
    if (!user) return 'guest';
    // Use authoritative membership from Core
    const mem = coreData?.memberships?.[portal.id] ?? coreData?.portals?.[portal.id] ?? null;
    if (mem) {
      if (!mem.canOpen) return 'none';
      return mem.access as AccessLevel;
    }
    // Local fallback
    if (!activeRole) return 'guest';
    if (portal.allowedRoles.includes(activeRole)) return 'full';
    if (portal.restrictedRoles?.includes(activeRole)) return 'restricted';
    return 'none';
  };

  /** Return the role for this specific portal (may differ from global role). */
  const getPortalRole = (portalId: string): string | null => {
    const mem = coreData?.memberships?.[portalId] ?? null;
    if (mem?.role) return mem.roleLabel ?? mem.role;
    return roleLabel || null;
  };

  const getDirectRoute = (portal: PortalDef): string => {
    const mem = coreData?.memberships?.['security'];
    const secRole = mem?.role ?? activeRole;

    if (portal.id === 'security') {
      // Determine the correct security dashboard destination
      const secDest = secRole === 'parent' || secRole === 'guardian'
        ? '/sistema/pais'
        : secRole === 'student'
          ? '/cursos'
          : '/sistema/seguranca';

      if (user) {
        // Already logged in — go directly
        return secDest;
      } else {
        // Not logged in — send to login with returnTo so we don't lose the destination
        return `/sistema?returnTo=${encodeURIComponent(secDest)}`;
      }
    }

    // For all other portals, the standard route applies
    if (!user) return portal.route;
    return portal.route;
  };

  const handleOpen = (portal: PortalDef) => {
    const access = getAccess(portal);
    if (access === 'none') {
      logAudit(portal.id, 'portal_denied');
      return;
    }

    // Fetch product context then navigate (non-blocking)
    const token = resolveToken();
    const localUser = resolveUser();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (localUser) {
      headers['x-enterprise-role'] = String(localUser.perfil || localUser.role || '');
      headers['x-user-id'] = String(localUser.id || '');
      headers['x-school-id'] = String(localUser.escola_id || localUser.school_id || '');
      headers['x-tenant-id'] = String(localUser.tenant_id || localUser.escola_id || '');
    }

    // Fire context resolution (async, then navigate)
    fetch(`/api/v1/core?action=context`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId: portal.id, userId: localUser?.id }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((ctx) => {
        if (ctx?.role) {
          // Persist product-scoped role so the portal picks it up
          try {
            const existing = JSON.parse(localStorage.getItem('currentUser') || '{}');
            localStorage.setItem('currentUser', JSON.stringify({
              ...existing,
              [`${portal.id}_role`]: ctx.role,
              [`${portal.id}_org`]: ctx.organizationId,
            }));
          } catch { /* non-critical */ }
        }
      })
      .catch(() => { /* non-blocking */ })
      .finally(() => {
        logAudit(portal.id, 'portal_open');
        const destination = getDirectRoute(portal);
        if (portal.external) { window.location.assign(portal.route); return; }
        navigate(destination);
      });
  };

  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              EduGuard<span className="text-emerald-400">360</span>
            </span>
          </div>
          <button
            onClick={() => navigate(isAuthenticated ? '/sistema' : '/login')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {isAuthenticated ? 'Dashboard' : language === 'pt' ? 'Entrar' : 'Sign In'}
          </button>
        </div>
      </header>

      {/* EduGuard ID Banner */}
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-4">
        {isAuthenticated ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-5 mb-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center shrink-0">
              <UserCircle2 className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-1">EduGuard ID</p>
              <p className="text-lg font-bold truncate">{displayName}</p>
              {displayEmail && <p className="text-sm text-slate-300">{displayEmail}</p>}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-slate-400">Perfil activo</p>
              <p className="text-sm font-semibold text-emerald-300">{roleLabel || '—'}</p>
              {(user?.escola_id || user?.school_id) && (
                <p className="text-xs text-slate-500 mt-1 truncate max-w-[160px]">
                  {user.escola_id ?? user.school_id}
                </p>
              )}
              {/* Core status indicator */}
              <div className="flex items-center justify-end gap-1 mt-2">
                {coreLoading && <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />}
                {!coreLoading && !coreError && coreData && (
                  <span className="text-[10px] text-emerald-500">● Core</span>
                )}
                {!coreLoading && coreError && (
                  <span className="text-[10px] text-amber-500">● Core offline</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-5 mb-8">
            <ShieldAlert className="w-8 h-8 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-amber-300">Não autenticado</p>
              <p className="text-sm text-slate-400">
                Inicie sessão para ver os seus portais e permissões de acesso.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="ml-auto shrink-0 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm transition-colors"
            >
              Entrar
            </button>
          </div>
        )}

        <h2 className="text-3xl font-bold mb-1">O seu ecossistema</h2>
        <p className="text-slate-400 mb-8">
          Uma conta. Vários produtos. Acesso seguro conforme a sua função.
        </p>
      </div>

      {/* Portal Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PORTALS.map((portal) => {
            const access = getAccess(portal);
            const blocked = access === 'none';
            if (blocked) return null;
            const portalRoleLabel = getPortalRole(portal.id);
            const accessLabel =
              access === 'full' ? `✓ ${portalRoleLabel || roleLabel || activeRole}` :
              access === 'restricted' ? `Acesso limitado · ${portalRoleLabel || roleLabel}` :
              'Requer autenticação';

            return (
              <div
                key={portal.id}
                onClick={() => !blocked && handleOpen(portal)}
                className={`relative rounded-2xl border bg-white/5 overflow-hidden flex flex-col transition-all duration-200
                  ${blocked
                    ? 'opacity-55 border-white/5'
                    : 'border-white/10 hover:border-white/25 hover:bg-white/[0.08] hover:shadow-2xl cursor-pointer'
                  }`}
              >
                {/* Top colour accent */}
                <div className={`h-1 w-full bg-gradient-to-r ${portal.color}`} />

                <div className="flex flex-col flex-1 p-5 gap-4">
                  {/* Icon + names */}
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${portal.color} flex items-center justify-center text-white shrink-0`}>
                      {portal.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-base truncate">{portal.name}</h3>
                      <p className="text-xs text-slate-400 truncate">{portal.subtitle}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-300 leading-relaxed flex-1">{portal.description}</p>

                  {/* Access badge */}
                  <div className="flex items-center gap-2 text-xs">
                    {access === 'full' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {access === 'restricted' && <Clock className="w-4 h-4 text-amber-400 shrink-0" />}
                    {access === 'none' && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    {access === 'guest' && <UserCircle2 className="w-4 h-4 text-slate-400 shrink-0" />}
                    <span className={
                      access === 'full' ? 'text-emerald-400' :
                      access === 'restricted' ? 'text-amber-400' :
                      access === 'none' ? 'text-rose-400' :
                      'text-slate-400'
                    }>
                      {accessLabel}
                    </span>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpen(portal); }}
                    disabled={blocked}
                    className={`w-full rounded-xl py-2.5 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all
                      ${blocked
                        ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                        : `bg-gradient-to-r ${portal.color} text-white hover:opacity-90 hover:shadow-lg`
                      }`}
                  >
                    {blocked ? (
                      <><Lock className="w-4 h-4" />Sem acesso</>
                    ) : access === 'guest' ? (
                      <><LogIn className="w-4 h-4" />Entrar para aceder</>
                    ) : (
                      <>Abrir <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} EduGuard360 · admin@eduguard360.co.mz</p>
        <p className="mt-1 text-xs">Uma conta. Vários produtos. Acesso seguro.</p>
      </footer>
    </div>
  );
};

export default EducuardPortalHub;
