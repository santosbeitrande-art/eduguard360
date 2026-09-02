import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { withTimeout } from '@/lib/networkPerformance';
import { normalizeEnterpriseRole } from '@/lib/enterpriseGovernance';

type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export';
type PermissionDomain =
  | 'schools'
  | 'users'
  | 'courses'
  | 'disciplines'
  | 'classes'
  | 'teachers'
  | 'students'
  | 'enrollments'
  | 'schedule'
  | 'grades'
  | 'attendance'
  | 'incidents'
  | 'payments'
  | 'employees'
  | 'documents'
  | 'qr'
  | 'analytics'
  | 'security'
  | 'workflow';

type WorkspaceModule = {
  slug: string;
  title: string;
  domain: PermissionDomain;
  description: string;
};

type WorkspaceCatalogResponse = {
  profile: string;
  label?: string;
  route?: string;
  portal?: string;
  title: string;
  description: string;
  modules: WorkspaceModule[];
  permissions: Partial<Record<PermissionDomain, PermissionAction[]>>;
  allowedRoutePrefixes?: string[];
  resolvedAt?: string;
  source?: string;
};

type RoleWorkspacePageProps = {
  profile: 'director' | 'administrator' | 'secretaria' | 'coordenador' | 'professor' | 'financeiro' | 'rh';
  baseRoute: string;
};

const actionLabels: Record<PermissionAction, string> = {
  create: 'Criar',
  read: 'Consultar',
  update: 'Atualizar',
  delete: 'Remover',
  approve: 'Aprovar',
  export: 'Exportar',
};

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

const buildHeaders = (currentUser: any): HeadersInit => {
  const token = localStorage.getItem('eduguard_token') || localStorage.getItem('token') || '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'x-enterprise-role': String(currentUser?.perfil || currentUser?.role || ''),
    'x-user-id': String(currentUser?.id || currentUser?.user_id || ''),
    'x-user-name': String(currentUser?.nome || currentUser?.name || currentUser?.email || ''),
    'x-school-id': String(currentUser?.escola_id || currentUser?.school_id || currentUser?.tenant_id || ''),
    'x-tenant-id': String(currentUser?.tenant_id || currentUser?.escola_id || currentUser?.school_id || ''),
  };
};

const AccessDenied = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-slate-950 text-white px-4 py-10">
    <div className="mx-auto max-w-xl rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
      <h1 className="text-2xl font-bold">Acesso negado</h1>
      <p className="mt-2 text-sm text-rose-100">{message}</p>
      <Link
        to="/portais"
        className="mt-5 inline-flex rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold hover:bg-white/25"
      >
        Voltar aos meus portais
      </Link>
    </div>
  </div>
);

const WORKSPACE_CATALOG_CACHE_KEY = 'eduguard_workspace_catalog_cache';

const readWorkspaceCatalogCache = (): Record<string, WorkspaceCatalogResponse> => {
  try {
    const raw = localStorage.getItem(WORKSPACE_CATALOG_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeWorkspaceCatalogCache = (profile: string, catalog: WorkspaceCatalogResponse) => {
  const current = readWorkspaceCatalogCache();
  current[profile] = catalog;
  localStorage.setItem(WORKSPACE_CATALOG_CACHE_KEY, JSON.stringify(current));
};

const RoleWorkspacePage = ({
  profile,
  baseRoute,
}: RoleWorkspacePageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { module } = useParams();

  const [ready, setReady] = useState(false);
  const [deniedReason, setDeniedReason] = useState<string | null>(null);
  const [backendPermissions, setBackendPermissions] = useState<Partial<Record<PermissionDomain, PermissionAction[]>>>({});
  const [workspaceTitle, setWorkspaceTitle] = useState('Workspace');
  const [workspaceDescription, setWorkspaceDescription] = useState('Modulos e permissoes carregados dinamicamente.');
  const [catalogModules, setCatalogModules] = useState<WorkspaceModule[]>([]);

  const currentModule = useMemo(() => {
    if (!module) return catalogModules[0] || null;
    return catalogModules.find((item) => item.slug === module) || null;
  }, [module, catalogModules]);

  useEffect(() => {
    const currentUser = resolveCurrentUserSnapshot();
    if (!currentUser) {
      navigate(`/sistema/login?returnTo=${encodeURIComponent(location.pathname)}`);
      return;
    }

    const currentRole = normalizeEnterpriseRole(currentUser?.perfil || currentUser?.role);
    if (currentRole !== profile) {
      setDeniedReason('O seu perfil nao possui autorizacao para este workspace.');
      setReady(true);
      return;
    }

    const headers = buildHeaders(currentUser);
    const requestCatalog = withTimeout(
      fetch('/api/v1/core?action=workspace-catalog', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          profile,
        }),
      }),
      8000,
      'Workspace catalog timeout'
    );

    requestCatalog
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`catalog-http-${res.status}`);
        }
        const data = await res.json() as WorkspaceCatalogResponse;

        if (!Array.isArray(data?.modules) || data.modules.length === 0) {
          throw new Error('catalog-empty-modules');
        }

        setWorkspaceTitle(String(data.title || 'Workspace'));
        setWorkspaceDescription(String(data.description || 'Modulos e permissoes carregados dinamicamente.'));
        setCatalogModules(data.modules);
        if (data.permissions && typeof data.permissions === 'object') {
          setBackendPermissions(data.permissions as Partial<Record<PermissionDomain, PermissionAction[]>>);
        }
        writeWorkspaceCatalogCache(profile, data);
      })
      .catch(() => {
        const cached = readWorkspaceCatalogCache()[profile];
        if (cached && Array.isArray(cached.modules) && cached.modules.length > 0) {
          setWorkspaceTitle(String(cached.title || 'Workspace'));
          setWorkspaceDescription(String(cached.description || 'Modulos e permissoes carregados dinamicamente.'));
          setCatalogModules(cached.modules);
          if (cached.permissions && typeof cached.permissions === 'object') {
            setBackendPermissions(cached.permissions as Partial<Record<PermissionDomain, PermissionAction[]>>);
          }
          return;
        }

        const fallbackSlug = (module && String(module).trim()) || 'workspace';
        setWorkspaceTitle('Workspace');
        setWorkspaceDescription('Catalogo remoto indisponivel no momento. Acesso de perfil mantido em modo resiliente.');
        setCatalogModules([
          {
            slug: fallbackSlug,
            title: module ? `Modulo: ${module}` : 'Workspace',
            domain: 'workflow',
            description: 'Operacao em modo resiliente enquanto o catalogo central nao responde.',
          },
        ]);
        setBackendPermissions({ workflow: ['read'] });
      })
      .finally(() => {
        setReady(true);
      });
  }, [navigate, location.pathname, profile]);

  useEffect(() => {
    if (!ready || deniedReason) return;
    if (!module) return;
    if (!currentModule) {
      setDeniedReason('Modulo invalido ou nao permitido para o seu perfil.');
    }
  }, [ready, deniedReason, module, currentModule]);

  const effectiveActions = useMemo(() => {
    if (!currentModule) return [] as PermissionAction[];
    const localActions: PermissionAction[] = ['create', 'read', 'update', 'delete', 'approve', 'export'];
    const serverActions = backendPermissions[currentModule.domain];

    if (!Array.isArray(serverActions) || serverActions.length === 0) {
      return localActions;
    }

    return localActions.filter((action) => serverActions.includes(action));
  }, [currentModule, backendPermissions]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-950 text-white px-4 py-10">
        <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-6">A carregar workspace...</div>
      </div>
    );
  }

  if (deniedReason) {
    return <AccessDenied message={deniedReason} />;
  }

  if (!currentModule) {
    return <AccessDenied message="Nao foi possivel resolver o modulo solicitado." />;
  }

  if (!effectiveActions.includes('read')) {
    return <AccessDenied message="Modulo sem permissao de consulta para o seu perfil." />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{workspaceTitle}</h1>
              <p className="mt-1 text-sm text-slate-300">{workspaceDescription}</p>
            </div>
            <Link to="/portais" className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              Meus portais
            </Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Modulos do perfil</p>
            <div className="mt-3 space-y-2">
              {catalogModules.map((item) => {
                const isActive = item.slug === currentModule.slug;
                return (
                  <Link
                    key={item.slug}
                    to={`${baseRoute}/${item.slug}`}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40' : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </aside>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-bold">{currentModule.title}</h2>
            <p className="mt-1 text-sm text-slate-300">{currentModule.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(['create', 'read', 'update', 'delete', 'approve', 'export'] as PermissionAction[]).map((action) => {
                const allowed = effectiveActions.includes(action);
                return (
                  <span
                    key={action}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      allowed ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40' : 'bg-rose-500/15 text-rose-200 border border-rose-500/35'
                    }`}
                  >
                    {actionLabels[action]}: {allowed ? 'SIM' : 'NAO'}
                  </span>
                );
              })}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(['create', 'update', 'approve', 'export'] as PermissionAction[]).map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={!effectiveActions.includes(action)}
                  className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                    effectiveActions.includes(action)
                      ? 'bg-emerald-500/90 text-slate-950 hover:bg-emerald-400'
                      : 'bg-white/5 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {actionLabels[action]}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export type { WorkspaceModule };
export default RoleWorkspacePage;
