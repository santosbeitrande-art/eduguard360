import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSelectorCompact } from "@/components/LanguageSelector";
import { SystemAuthProvider, useSystemAuth } from "@/context/SystemAuthContext";
import { withTimeout, NetworkTimeoutError } from "@/lib/networkPerformance";

type BillingCycle = "monthly" | "quarterly" | "annual";

type SchoolSubscription = {
  schoolId: string;
  cycle: BillingCycle;
  status: "active" | "inactive";
  amountMzn: number;
  paidAt: string;
  validUntil: string;
  provider?: "mpesa" | "emola";
  phone?: string;
};

type SchoolTrial = {
  schoolId: string;
  startedAt: string;
  validUntil: string;
};

type AccountStatusTone = 'ok' | 'warn' | 'error' | 'info';

type AccountStatusItem = {
  label: string;
  value: string;
  tone: AccountStatusTone;
};

type AccountStatusPanel = {
  title: string;
  summary: string;
  tone: AccountStatusTone;
  items: AccountStatusItem[];
};

type AccessProfile =
  | 'super_admin'
  | 'director'
  | 'administrator'
  | 'secretaria'
  | 'coordenador'
  | 'professor'
  | 'financeiro'
  | 'rh'
  | 'seguranca'
  | 'parent'
  | 'student';

const accessProfileOptions: Array<{ value: AccessProfile; label: string }> = [
  { value: 'super_admin', label: 'Administração Geral' },
  { value: 'director', label: 'Direção' },
  { value: 'administrator', label: 'Administração Escolar' },
  { value: 'secretaria', label: 'Secretaria Académica' },
  { value: 'coordenador', label: 'Coordenação Académica' },
  { value: 'professor', label: 'Professor' },
  { value: 'financeiro', label: 'Gestão Financeira' },
  { value: 'rh', label: 'Recursos Humanos' },
  { value: 'seguranca', label: 'Segurança Operacional / QR Code' },
  { value: 'parent', label: 'Encarregado' },
  { value: 'student', label: 'Aluno' },
];

const SCHOOL_SUBSCRIPTIONS_KEY = "eduguard_school_subscriptions";
const SCHOOL_TRIALS_KEY = "eduguard_school_trials";
const LOCAL_APPROVED_USERS_KEY = 'eduguard_locally_approved_users';
const SCHOOLS_CACHE_KEY = 'eduguard_admin_schools_cache';
const GENERATED_CREDENTIALS_LOG_KEY = 'eduguard_generated_credentials_log';
const KNOWN_ADMIN_EMAIL = 'admin@eduguard360.co.mz';
const SECURITY_PORTAL_ROLE = 'seguranca';

const cycleConfig: Record<BillingCycle, { days: number; amountMzn: number }> = {
  monthly: { days: 30, amountMzn: 3500 },
  quarterly: { days: 90, amountMzn: 9500 },
  annual: { days: 365, amountMzn: 36000 }
};

const readSchoolSubscriptions = (): SchoolSubscription[] => {
  try {
    const raw = localStorage.getItem(SCHOOL_SUBSCRIPTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeSchoolSubscriptions = (items: SchoolSubscription[]) => {
  localStorage.setItem(SCHOOL_SUBSCRIPTIONS_KEY, JSON.stringify(items));
};

const getSchoolSubscription = (schoolId: string | null | undefined): SchoolSubscription | null => {
  if (!schoolId) return null;
  const list = readSchoolSubscriptions();
  const found = list.find((item) => item.schoolId === schoolId);
  return found || null;
};

const isSubscriptionActive = (sub: SchoolSubscription | null): boolean => {
  if (!sub || sub.status !== "active") return false;
  return new Date(sub.validUntil).getTime() > Date.now();
};

const readSchoolTrials = (): SchoolTrial[] => {
  try {
    const raw = localStorage.getItem(SCHOOL_TRIALS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeSchoolTrials = (items: SchoolTrial[]) => {
  localStorage.setItem(SCHOOL_TRIALS_KEY, JSON.stringify(items));
};

const ensureSchoolTrial = (schoolId: string): SchoolTrial => {
  const trials = readSchoolTrials();
  const existing = trials.find((item) => item.schoolId === schoolId);
  if (existing) return existing;

  const startedAt = new Date().toISOString();
  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const created: SchoolTrial = { schoolId, startedAt, validUntil };
  trials.push(created);
  writeSchoolTrials(trials);
  return created;
};

const getSchoolTrial = (schoolId: string | null | undefined): SchoolTrial | null => {
  if (!schoolId) return null;
  return readSchoolTrials().find((item) => item.schoolId === schoolId) || null;
};

const isTrialActive = (trial: SchoolTrial | null): boolean => {
  if (!trial) return false;
  return new Date(trial.validUntil).getTime() > Date.now();
};

const isAlreadyRegisteredError = (message: string): boolean => {
  const text = message.toLowerCase();
  return text.includes('already registered') || text.includes('already been registered') || text.includes('user already registered');
};

const isMissingColumnError = (error: any, columnName: string): boolean => {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  const missingByPostgrest = code === 'PGRST204' && message.includes(String(columnName || '').toLowerCase());
  const missingByPostgres = code === '42703' && message.includes(String(columnName || '').toLowerCase());
  return missingByPostgrest || missingByPostgres;
};

const isNoRowsError = (error: any): boolean => {
  const code = String(error?.code || '');
  const status = Number(error?.status || 0);
  const message = String(error?.message || '').toLowerCase();
  return code === 'PGRST116' || status === 406 || message.includes('0 rows');
};

const isPermissionDeniedError = (error: any): boolean => {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === '42501' || message.includes('row-level security') || message.includes('permission denied');
};

const readLocalApprovedUsers = (): any[] => {
  try {
    const raw = localStorage.getItem(LOCAL_APPROVED_USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readSchoolsCache = (): Array<{ id: string; nome: string }> => {
  try {
    const raw = localStorage.getItem(SCHOOLS_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeSchoolsCache = (schools: Array<{ id: string; nome: string }>) => {
  localStorage.setItem(SCHOOLS_CACHE_KEY, JSON.stringify(schools));
};

const readPendingRegistrations = (): any[] => {
  try {
    const raw = localStorage.getItem('eduguard_pending_registrations');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const readGeneratedCredentialsLog = (): any[] => {
  try {
    const raw = localStorage.getItem(GENERATED_CREDENTIALS_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeLegacyProfile = (perfil: unknown): string => {
  const normalized = String(perfil || '').trim().toLowerCase();
  if (normalized === 'super_admin' || normalized === 'admin' || normalized === 'superadmin') return 'super_admin';
  if (normalized === 'school_admin' || normalized === 'director' || normalized === 'diretor') return 'director';
  if (normalized === 'administrator') return 'administrator';
  if (normalized === 'secretaria' || normalized === 'secretariat') return 'secretaria';
  if (normalized === 'coordenador' || normalized === 'coordinator') return 'coordenador';
  if (normalized === 'teacher' || normalized === 'professor' || normalized === 'docente') return 'professor';
  if (normalized === 'financeiro' || normalized === 'finance') return 'financeiro';
  if (normalized === 'rh' || normalized === 'hr') return 'rh';
  if (normalized === 'scanner' || normalized === 'security' || normalized === 'seguranca') return 'seguranca';
  if (normalized === 'parent' || normalized === 'pai' || normalized === 'encarregado' || normalized === 'guardian') return 'parent';
  if (normalized === 'student' || normalized === 'aluno') return 'student';
  return normalized;
};

const mapEdgeUserToLegacyProfile = (edgeUser: any): string => {
  const role = String(edgeUser?.role || '').trim().toLowerCase();
  const type = String(edgeUser?.type || '').trim().toLowerCase();

  if (type === 'parent' || role === 'parent' || role === 'guardian' || role === 'encarregado' || role === 'pai') return 'parent';
  if (type === 'student' || role === 'student' || role === 'aluno') return 'student';
  return normalizeLegacyProfile(role || type || 'director') || 'director';
};

const getAccessProfileLabel = (accessProfile: string): string => {
  if (accessProfile === 'super_admin') return 'Administração Geral';
  if (accessProfile === 'director') return 'Direção';
  if (accessProfile === 'administrator') return 'Administração Escolar';
  if (accessProfile === 'secretaria') return 'Secretaria Académica';
  if (accessProfile === 'coordenador') return 'Coordenação Académica';
  if (accessProfile === 'professor') return 'Professor';
  if (accessProfile === 'financeiro') return 'Gestão Financeira';
  if (accessProfile === 'rh') return 'Recursos Humanos';
  if (accessProfile === 'seguranca') return 'Segurança Operacional / QR Code';
  if (accessProfile === 'parent') return 'Encarregado';
  if (accessProfile === 'student') return 'Aluno';
  return accessProfile;
};

const getAccessProfileLabelFromLegacyProfile = (perfil: string): string => {
  const normalized = normalizeLegacyProfile(perfil);
  if (normalized === 'super_admin') return getAccessProfileLabel('super_admin');
  if (normalized === 'director') return getAccessProfileLabel('director');
  if (normalized === 'administrator') return getAccessProfileLabel('administrator');
  if (normalized === 'secretaria') return getAccessProfileLabel('secretaria');
  if (normalized === 'coordenador') return getAccessProfileLabel('coordenador');
  if (normalized === 'professor') return getAccessProfileLabel('professor');
  if (normalized === 'financeiro') return getAccessProfileLabel('financeiro');
  if (normalized === 'rh') return getAccessProfileLabel('rh');
  if (normalized === 'seguranca') return getAccessProfileLabel('seguranca');
  if (normalized === 'parent') return getAccessProfileLabel('parent');
  if (normalized === 'student') return getAccessProfileLabel('student');
  return 'perfil correto';
};

const mapAccessProfileToLegacyProfile = (accessProfile: string): string => {
  if (accessProfile === 'teacher') return 'professor';
  if (accessProfile === 'scanner') return 'seguranca';
  if (accessProfile === 'pai') return 'parent';
  if (accessProfile === 'admin') return 'super_admin';
  return accessProfile;
};

const getRequestedReturnRoute = (): string | null => {
  const searchParams = new URLSearchParams(window.location.search);
  const returnTo = searchParams.get('returnTo')?.trim() || '';

  if (!returnTo) return '/sistema/escola';
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return null;

  return returnTo;
};

const getDefaultRouteByProfile = (perfil: string): string => {
  const normalized = normalizeLegacyProfile(perfil);
  if (normalized === 'super_admin') return '/sistema/admin';
  if (normalized === 'parent' || normalized === 'student') return '/sistema/pais';
  return '/sistema/escola';
};

const normalizeKnownAdminUser = (user: any): any => {
  if (!user) return user;
  const normalizedEmail = String(user?.email || '').trim().toLowerCase();
  if (normalizedEmail !== KNOWN_ADMIN_EMAIL) return user;
  return {
    ...user,
    perfil: SECURITY_PORTAL_ROLE,
    role: SECURITY_PORTAL_ROLE,
    status: 'active',
    is_active: true,
  };
};

const getLegacyProfileLabel = (perfil: string): string => {
  const normalized = normalizeLegacyProfile(perfil);
  if (normalized === 'super_admin') return 'Administração Geral';
  if (normalized === 'director') return 'Direção';
  if (normalized === 'administrator') return 'Administração Escolar';
  if (normalized === 'secretaria') return 'Secretaria Académica';
  if (normalized === 'coordenador') return 'Coordenação Académica';
  if (normalized === 'professor') return 'Professor';
  if (normalized === 'financeiro') return 'Gestão Financeira';
  if (normalized === 'rh') return 'Recursos Humanos';
  if (normalized === 'seguranca') return 'Segurança Operacional QR Code';
  if (normalized === 'parent') return 'Encarregado';
  if (normalized === 'student') return 'Aluno';
  return normalized || 'Utilizador';
};

const resolveLoginErrorMessage = (params: {
  authError: any;
  edgeError?: string;
  hasDomainUser?: boolean;
  requestedProfile?: string;
  email?: string;
}): string => {
  const authMessage = String(params.authError?.message || '').trim();
  const edgeMessage = String(params.edgeError || '').trim();
  const merged = `${authMessage} ${edgeMessage}`.toLowerCase();

  if (merged.includes('email not confirmed') || merged.includes('ainda nao confirmado') || merged.includes('not confirmed')) {
    return 'Email ainda nao confirmado. Verifique a sua caixa de entrada para ativar a conta.';
  }

  if (merged.includes('invalid login credentials') || merged.includes('invalid credentials') || merged.includes('credenciais invalidas') || merged.includes('email ou senha')) {
    return 'Email ou senha incorretos. Verifique os dados e tente novamente.';
  }

  if (merged.includes('too many requests') || merged.includes('rate limit')) {
    return 'Muitas tentativas de login em pouco tempo. Aguarde alguns minutos e tente novamente.';
  }

  if (merged.includes('network') || merged.includes('failed to fetch') || merged.includes('timeout') || merged.includes('timed out')) {
    return 'Falha de ligacao ao servidor. Verifique a internet e tente novamente.';
  }

  if (merged.includes('pending') || merged.includes('pendente') || merged.includes('inactive') || merged.includes('inativo')) {
    return 'Conta ainda pendente/inativa. Aguarde aprovacao do administrador.';
  }

  if (authMessage) return authMessage;
  if (edgeMessage) return edgeMessage;
  if (params.hasDomainUser) {
    if (params.requestedProfile === 'director' && String(params.email || '').trim().toLowerCase() === KNOWN_ADMIN_EMAIL) {
      return 'A conta admin existe, mas o login remoto nao respondeu corretamente. Tente novamente em alguns segundos ou redefina a palavra-passe do admin.';
    }
    return 'Conta encontrada, mas a autenticacao falhou. Tente recuperar a senha em "Esqueceu a senha?".';
  }

  return 'Nao foi possivel iniciar sessao. Verifique email, senha e perfil de acesso.';
};

const buildFallbackSchoolsFromLocalSources = (): Array<{ id: string; nome: string }> => {
  const fromCache = readSchoolsCache();
  if (fromCache.length > 0) return fromCache;

  const ids = new Set<string>();
  for (const item of readPendingRegistrations()) {
    if (item?.escola_id) ids.add(String(item.escola_id));
  }
  for (const item of readLocalApprovedUsers()) {
    if (item?.escola_id) ids.add(String(item.escola_id));
  }

  return Array.from(ids).map((id) => ({
    id,
    nome: `Escola ${id.slice(0, 8)}`,
  }));
};

const buildFallbackSchoolsFromUsers = async (): Promise<Array<{ id: string; nome: string }>> => {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('utilizadores')
        .select('escola_id')
        .not('escola_id', 'is', null)
        .limit(200),
      10000,
      'Users fallback schools timeout'
    );

    if (error || !Array.isArray(data) || data.length === 0) return [];

    const ids = Array.from(new Set(
      data
        .map((item: any) => String(item?.escola_id || '').trim())
        .filter(Boolean)
    ));

    return ids.map((id) => ({ id, nome: `Escola ${id.slice(0, 8)}` }));
  } catch {
    return [];
  }
};

const fetchDomainUserForAccountStatus = async (email: string) => {
  const attempts = [
    'id,email,perfil,status,is_active,auth_id',
    'id,email,perfil,auth_id',
    'id,email,perfil',
  ];

  for (const selectClause of attempts) {
    const result = await withTimeout(
      supabase
        .from('utilizadores')
        .select(selectClause)
        .eq('email', email)
        .maybeSingle(),
      12000,
      'Account status check timeout'
    );

    if (!result.error) {
      return { data: result.data, error: null };
    }

    if (isNoRowsError(result.error)) {
      return { data: null, error: null };
    }

    const missingKnownColumn =
      isMissingColumnError(result.error, 'status')
      || isMissingColumnError(result.error, 'is_active')
      || isMissingColumnError(result.error, 'auth_id');

    if (!missingKnownColumn) {
      return { data: null, error: result.error };
    }
  }

  return { data: null, error: { message: 'unable-to-read-account-status' } };
};

const SystemLoginContent = () => {
  const { t } = useLanguage();
  const { login: edgeLogin } = useSystemAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState("director");
  const [accessProfile, setAccessProfile] = useState<AccessProfile>('director');
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [paymentProvider, setPaymentProvider] = useState<"mpesa" | "emola">("mpesa");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentPin, setPaymentPin] = useState("");
  const [awaitingPin, setAwaitingPin] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<string | null>(null);
  const [schools, setSchools] = useState<Array<{ id: string; nome: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accountStatusPanel, setAccountStatusPanel] = useState<AccountStatusPanel | null>(null);
  const [checkingAccountStatus, setCheckingAccountStatus] = useState(false);
  const navigate = useNavigate();

  const loadSchools = async () => {
    setLoadingSchools(true);
    try {
      const { data, error } = await withTimeout(
        supabase.from("escolas").select("id,nome").order("nome"),
        10000,
        'Schools load timeout'
      );
      if (!error && Array.isArray(data) && data.length > 0) {
        const fetchedSchools = (data || []) as Array<{ id: string; nome: string }>;
        setSchools(fetchedSchools);
        writeSchoolsCache(fetchedSchools);
      } else {
        const fallbackFromUsers = await buildFallbackSchoolsFromUsers();
        if (fallbackFromUsers.length > 0) {
          setSchools(fallbackFromUsers);
        } else {
          const fallbackSchools = buildFallbackSchoolsFromLocalSources();
          if (fallbackSchools.length > 0) {
            setSchools(fallbackSchools);
          }
        }
      }
    } catch (err) {
      console.error(err);
      const fallbackFromUsers = await buildFallbackSchoolsFromUsers();
      if (fallbackFromUsers.length > 0) {
        setSchools(fallbackFromUsers);
      } else {
        const fallbackSchools = buildFallbackSchoolsFromLocalSources();
        if (fallbackSchools.length > 0) {
          setSchools(fallbackSchools);
        }
      }
    } finally {
      setLoadingSchools(false);
    }
  };

  useEffect(() => {
    const cachedSchools = readSchoolsCache();
    if (cachedSchools.length > 0) {
      setSchools(cachedSchools);
    }

    loadSchools();
  }, []);

  const isPendingUser = (user: any): boolean => user?.status === 'pending' || user?.status === 'inactive' || user?.is_active === false;

  const redirectByProfile = (perfil: string) => {
    const requestedRoute = getRequestedReturnRoute();
    const route = requestedRoute || getDefaultRouteByProfile(perfil);
    navigate(route);
  };

  const persistLegacyUserFromEdgeAuth = (edgeUser: any) => {
    if (!edgeUser) return;

    const legacyPerfil = mapEdgeUserToLegacyProfile(edgeUser);

    localStorage.setItem('currentUser', JSON.stringify({
      id: edgeUser.id,
      auth_id: edgeUser.id,
      nome: edgeUser.name,
      email: edgeUser.email,
      perfil: legacyPerfil,
      escola_id: edgeUser.school_id || null,
      password_changed: edgeUser.password_changed ?? true,
    }));
  };

  const completeLogin = (user: any, useCompatibilityMode = false): boolean => {
    let normalizedUser = normalizeKnownAdminUser(user);

    const normalizedEmail = String(normalizedUser?.email || '').trim().toLowerCase();
    const localApproved = readLocalApprovedUsers().find((item) => String(item?.email || '').trim().toLowerCase() === normalizedEmail);
    if (localApproved) {
      normalizedUser = {
        ...normalizedUser,
        status: 'active',
        is_active: true,
      };
    }

    if (!normalizedUser) {
      setErrorMessage(t('sistema.erro_login'));
      return false;
    }

    if (isPendingUser(normalizedUser)) {
      setErrorMessage(t('sistema.registo_pendente'));
      return false;
    }

    const perfil = normalizeLegacyProfile(normalizedUser?.perfil || normalizedUser?.role);

    const schoolId = normalizedUser.escola_id || null;
    if (schoolId && perfil !== 'super_admin') {
      const trial = getSchoolTrial(schoolId) || ensureSchoolTrial(schoolId);
      const subscription = getSchoolSubscription(schoolId);
      const trialActive = isTrialActive(trial);
      const subscriptionActive = isSubscriptionActive(subscription);

      if (!trialActive && !subscriptionActive) {
        setErrorMessage(t('sistema.pagamento_escola_obrigatorio'));
        setInfoMessage(t('sistema.pagamento_escola_plans'));
        return false;
      }

      if (trialActive && !subscriptionActive) {
        setInfoMessage(`${t('sistema.trial_ativo_ate')}: ${new Date(trial.validUntil).toLocaleDateString()}`);
      }
    }

    if (useCompatibilityMode) {
      setInfoMessage('Acesso efetuado em modo de compatibilidade. Atualize a senha em "Esqueceu a senha?" se necessário.');
    }

    localStorage.setItem('currentUser', JSON.stringify({
      ...normalizedUser,
      perfil,
      email: String(normalizedUser?.email || '').trim().toLowerCase(),
    }));
    redirectByProfile(perfil);
    return true;
  };

  const resolveLocalFallbackUser = (normalizedEmail: string, normalizedPassword: string) => {
    if (normalizedEmail === KNOWN_ADMIN_EMAIL) {
      const currentUserRaw = localStorage.getItem('currentUser');
      if (currentUserRaw) {
        try {
          const currentUser = JSON.parse(currentUserRaw);
          const currentEmail = String(currentUser?.email || '').trim().toLowerCase();
          const currentPassword = String(currentUser?.senha || '').trim();
          if (currentEmail === normalizedEmail && currentPassword && currentPassword === normalizedPassword) {
            return {
              ...currentUser,
              perfil: SECURITY_PORTAL_ROLE,
              status: 'active',
              is_active: true,
            };
          }
        } catch {
          // Ignore parse failures and continue with other fallbacks.
        }
      }
    }

    const approvedUser = readLocalApprovedUsers().find((item) => String(item?.email || '').trim().toLowerCase() === normalizedEmail);
    if (approvedUser && String(approvedUser?.senha || '').trim() === normalizedPassword) {
      return approvedUser;
    }

    const pendingUser = readPendingRegistrations().find((item) => String(item?.email || '').trim().toLowerCase() === normalizedEmail);
    if (pendingUser && String(pendingUser?.senha || '').trim() === normalizedPassword && !isPendingUser(pendingUser)) {
      return pendingUser;
    }

    const generatedEntry = readGeneratedCredentialsLog().find((item) =>
      String(item?.email || '').trim().toLowerCase() === normalizedEmail &&
      String(item?.senha || '').trim() === normalizedPassword
    );

    if (generatedEntry) {
      return {
        id: generatedEntry.id || `local-${Date.now()}`,
        nome: generatedEntry.nome || normalizedEmail,
        email: normalizedEmail,
        perfil: generatedEntry.perfil || generatedEntry.role || 'pai',
        escola_id: null,
        senha: normalizedPassword,
        status: 'active',
        is_active: true,
        approved_locally: true,
      };
    }

    return null;
  };

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const isSecurityPortalAccount = normalizedEmail === KNOWN_ADMIN_EMAIL;

    if (!normalizedEmail || !normalizedPassword) {
      setLoading(false);
      setErrorMessage('Informe email e senha para entrar.');
      return;
    }

    let edgeErrorMessage = '';
    let domainUserByEmail: any = null;

    try {
      // The school security account must not pass through the enterprise edge auth path,
      // because that backend can elevate it to a generic admin role.
      if (!isSecurityPortalAccount) {
        // Single login entrypoint: try both user types automatically.
        const edgeAttempts: Array<'system' | 'parent'> = ['system', 'parent'];
        for (const attemptType of edgeAttempts) {
          const edgeResult = await withTimeout(
            edgeLogin(normalizedEmail, normalizedPassword, attemptType),
            12000,
            'Edge login timeout'
          );
          edgeErrorMessage = String(edgeResult?.error || edgeErrorMessage || '');
          if (!edgeResult.success) continue;

          const edgeUserRaw = localStorage.getItem('eduguard_user');
          if (!edgeUserRaw) continue;

          try {
            const edgeUser = JSON.parse(edgeUserRaw);
            persistLegacyUserFromEdgeAuth(edgeUser);
            const perfil = mapEdgeUserToLegacyProfile(edgeUser);
            redirectByProfile(perfil);
            return;
          } catch (parseError) {
            console.warn('Falha ao ler eduguard_user apos edge login', parseError);
          }
        }
      }

      let authData: any = null;
      let authError: any = null;

      const firstSignIn = await withTimeout(supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      }), 12000, 'Sign-in timeout');

      authData = firstSignIn.data;
      authError = firstSignIn.error;

      if (authError || !authData?.user) {
        const { data: domainUser } = await supabase
          .from("utilizadores")
          .select("*")
          .eq("email", normalizedEmail)
          .maybeSingle();
        domainUserByEmail = domainUser;
        const localApprovedUser = resolveLocalFallbackUser(normalizedEmail, normalizedPassword);

        const canAutoProvisionAuth = Boolean(domainUserByEmail?.id && !domainUserByEmail?.auth_id);

        if (canAutoProvisionAuth) {
          const signUpAttempt = await withTimeout(supabase.auth.signUp({
            email: normalizedEmail,
            password: normalizedPassword,
            options: { data: { source: 'system-login-autoprovision' } }
          }), 12000, 'Auto-provision timeout');

          const signUpErrorMessage = String(signUpAttempt.error?.message || '');
          if (!signUpAttempt.error || isAlreadyRegisteredError(signUpErrorMessage)) {
            const retrySignIn = await withTimeout(supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: normalizedPassword,
            }), 12000, 'Retry sign-in timeout');

            authData = retrySignIn.data;
            authError = retrySignIn.error;
          } else {
            authError = signUpAttempt.error;
          }
        }

        const fallbackPassword = String(domainUserByEmail?.senha || '');
        const hasDomainUser = Boolean(domainUserByEmail?.id);
        const hasStoredPassword = fallbackPassword.length > 0;

        // Autonomous recovery path: if account exists in domain table but has no password yet,
        // bootstrap it with the entered password and allow access for approved users.
        if ((!authData?.user || authError) && hasDomainUser && !hasStoredPassword) {
          const { error: setPasswordError } = await withTimeout(supabase
            .from('utilizadores')
            .update({ senha: normalizedPassword })
            .eq('id', domainUserByEmail.id), 12000, 'Password bootstrap timeout');

          if (!setPasswordError) {
            if (normalizedEmail === KNOWN_ADMIN_EMAIL) {
              localStorage.setItem('currentUser', JSON.stringify({
                ...domainUserByEmail,
                senha: normalizedPassword,
                perfil: SECURITY_PORTAL_ROLE,
                status: 'active',
                is_active: true,
              }));
            }
            const didLogin = completeLogin({ ...domainUserByEmail, senha: normalizedPassword }, true);
            if (didLogin) {
              return;
            }
          }
        }

        if ((!authData?.user || authError) && hasDomainUser && hasStoredPassword && fallbackPassword === normalizedPassword) {
          const didLogin = completeLogin(domainUserByEmail, true);
          if (didLogin) {
            return;
          }
        }

        if ((!authData?.user || authError) && localApprovedUser) {
          const didLogin = completeLogin(localApprovedUser, true);
          if (didLogin) {
            return;
          }
        }
      }

      if (authError || !authData?.user) {
        setErrorMessage(resolveLoginErrorMessage({
          authError,
          edgeError: edgeErrorMessage,
          hasDomainUser: Boolean(domainUserByEmail?.id),
          requestedProfile: accessProfile,
          email: normalizedEmail,
        }));
        return;
      }

      const userId = authData.user.id;
      
      // Buscar utilizador na tabela "utilizadores". Em bases antigas, auth_id pode estar vazio.
      const { data: userByAuth } = await withTimeout(supabase
        .from("utilizadores")
        .select("*")
        .eq("auth_id", userId)
        .maybeSingle(), 12000, 'User lookup timeout');

      let user = userByAuth;

      if (!user) {
        const { data: userByEmail } = await withTimeout(supabase
          .from("utilizadores")
          .select("*")
          .eq("email", normalizedEmail)
          .maybeSingle(), 12000, 'User email lookup timeout');

        user = userByEmail;

        if (user?.id && !user?.auth_id) {
          // Melhor esforço para vincular o auth user à conta de domínio.
          await withTimeout(supabase
            .from("utilizadores")
            .update({ auth_id: userId })
            .eq("id", user.id), 12000, 'User link timeout');

          user = { ...user, auth_id: userId };
        }
      }

      if (!user) {
        const localFallbackUser = resolveLocalFallbackUser(normalizedEmail, normalizedPassword);
        if (localFallbackUser) {
          const didLogin = completeLogin(localFallbackUser, true);
          if (didLogin) {
            return;
          }
        }
      }

      completeLogin(user);
    } catch (err) {
      if (err instanceof NetworkTimeoutError) {
        setErrorMessage('Tempo excedido ao ligar ao servidor. Tente novamente.');
        return;
      }
      console.error(err);
      setErrorMessage(t('mensagens.erro_generico'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAccountStatus = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setAccountStatusPanel({
        title: 'Estado da conta',
        summary: 'Informe um email para verificar o estado da conta.',
        tone: 'warn',
        items: [
          { label: 'Email', value: 'Nao informado', tone: 'warn' },
          { label: 'Perfil esperado', value: getAccessProfileLabel(accessProfile), tone: 'info' },
        ],
      });
      return;
    }

    setCheckingAccountStatus(true);
    setAccountStatusPanel(null);

    try {
      const expectedLegacyProfile = mapAccessProfileToLegacyProfile(accessProfile);
      const expectedProfileLabel = getAccessProfileLabel(accessProfile);
      const localPending = readPendingRegistrations().find((item) => String(item?.email || '').trim().toLowerCase() === normalizedEmail);
      const localApproved = readLocalApprovedUsers().find((item) => String(item?.email || '').trim().toLowerCase() === normalizedEmail);

      const localGenerated = readGeneratedCredentialsLog().find((item) =>
        String(item?.email || '').trim().toLowerCase() === normalizedEmail
      );

      let domainUser: any = null;
      let serverIssue = false;
      try {
        const { data, error } = await fetchDomainUserForAccountStatus(normalizedEmail);
        if (error) {
          serverIssue = true;
        } else {
          domainUser = data;
        }
      } catch {
        serverIssue = true;
      }

      const localFallbackUser = localApproved || localPending || (localGenerated
        ? {
            email: localGenerated.email,
            perfil: localGenerated.perfil || localGenerated.role,
            status: 'active',
            is_active: true,
            auth_id: null,
          }
        : null);

      if (!domainUser && !localFallbackUser) {
        setAccountStatusPanel({
          title: 'Estado da conta',
          summary: serverIssue
            ? 'Servidor indisponivel. Nao encontramos este email no cache local.'
            : 'Nao encontramos este email no sistema. Faca o cadastro primeiro.',
          tone: serverIssue ? 'warn' : 'error',
          items: [
            { label: 'Email', value: normalizedEmail, tone: 'info' },
            { label: 'Perfil esperado', value: expectedProfileLabel, tone: 'info' },
            { label: 'Fonte de dados', value: serverIssue ? 'Cache local (modo offline)' : 'Servidor', tone: serverIssue ? 'warn' : 'info' },
            { label: 'Cadastro', value: 'Conta nao encontrada', tone: serverIssue ? 'warn' : 'error' },
          ],
        });
        return;
      }

      const sourceUser = domainUser || localFallbackUser;
      const profileSource = sourceUser?.perfil || '';
      const normalizedProfile = normalizeLegacyProfile(profileSource);
      const profileMatches = normalizedProfile === expectedLegacyProfile || normalizedProfile === 'super_admin';
      const profileTone: AccountStatusTone = profileMatches ? 'ok' : 'warn';
      const profileValue = profileMatches
        ? `${getLegacyProfileLabel(normalizedProfile)} (ok para este acesso)`
        : `${getLegacyProfileLabel(normalizedProfile)}. Troque o perfil no topo para ${getLegacyProfileLabel(normalizedProfile)}.`;

      const isPending = sourceUser?.status === 'pending' || sourceUser?.status === 'inactive' || sourceUser?.is_active === false || Boolean(localPending && !localApproved);
      const approvalTone: AccountStatusTone = isPending ? 'warn' : 'ok';
      const approvalValue = isPending
        ? 'Aprovacao pendente/inativa. Aguarde validacao do administrador.'
        : 'Aprovada para acesso.';

      const hasAuthLink = Boolean(sourceUser?.auth_id || localPending?.auth_id || localApproved?.auth_id);
      const emailConfirmTone: AccountStatusTone = serverIssue ? 'warn' : hasAuthLink ? 'info' : 'warn';
      const emailConfirmValue = serverIssue
        ? 'Nao foi possivel confirmar no servidor. Mostrando estado a partir do cache local.'
        : hasAuthLink
          ? 'Conta vinculada ao login. Se falhar ao entrar, confirme o email e redefina a senha.'
          : 'Cadastro sem vinculacao completa de login. Aguarde aprovacao/reparacao do admin.';

      const canLoginNow = profileMatches && !isPending;
      setAccountStatusPanel({
        title: 'Estado da conta',
        summary: serverIssue
          ? 'Servidor indisponivel. Estado montado com dados locais para orientar o acesso.'
          : canLoginNow
            ? 'A conta parece pronta para login neste perfil.'
            : 'A conta precisa de ajuste antes do acesso. Veja os pontos abaixo.',
        tone: serverIssue ? 'warn' : canLoginNow ? 'ok' : 'warn',
        items: [
          { label: 'Email', value: normalizedEmail, tone: 'info' },
          { label: 'Perfil esperado', value: expectedProfileLabel, tone: 'info' },
          { label: 'Fonte de dados', value: domainUser ? 'Servidor + cache local' : 'Cache local (modo offline)', tone: domainUser ? 'info' : 'warn' },
          { label: 'Perfil registado', value: profileValue, tone: profileTone },
          { label: 'Aprovacao', value: approvalValue, tone: approvalTone },
          { label: 'Confirmacao de email/login', value: emailConfirmValue, tone: emailConfirmTone },
        ],
      });
    } catch (err) {
      if (err instanceof NetworkTimeoutError) {
        setAccountStatusPanel({
          title: 'Estado da conta',
          summary: 'Tempo excedido ao verificar conta. Tente novamente.',
          tone: 'warn',
          items: [
            { label: 'Email', value: normalizedEmail, tone: 'info' },
            { label: 'Perfil esperado', value: getAccessProfileLabel(accessProfile), tone: 'info' },
          ],
        });
      } else {
        setAccountStatusPanel({
          title: 'Estado da conta',
          summary: 'Erro inesperado ao verificar estado da conta.',
          tone: 'error',
          items: [
            { label: 'Email', value: normalizedEmail, tone: 'info' },
            { label: 'Perfil esperado', value: getAccessProfileLabel(accessProfile), tone: 'info' },
          ],
        });
      }
    } finally {
      setCheckingAccountStatus(false);
    }
  };

  const handlePasswordRecovery = async () => {
    setLoading(true);
    setInfoMessage(null);
    setErrorMessage(null);
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage(t('sistema.erro_login'));
      setLoading(false);
      return;
    }

    try {
      const { error } = await withTimeout(supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/sistema`
      }), 12000, 'Password recovery timeout');

      if (error) {
        setErrorMessage(error.message || t('mensagens.erro_generico'));
      } else {
        setInfoMessage(t('sistema.link_recuperacao_enviado'));
        setRecoveryMode(false);
      }
    } catch (err: any) {
      if (err instanceof NetworkTimeoutError) {
        setErrorMessage('Tempo excedido ao ligar ao servidor. Tente novamente.');
        return;
      }
      console.error(err);
      setErrorMessage(err?.message || t('mensagens.erro_generico'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelfRegister = async () => {
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    const normalizedPassword = password.trim();

    if (!normalizedName || !normalizedEmail || normalizedPassword.length < 6) {
      setErrorMessage(t('sistema.preencher_campos'));
      setLoading(false);
      return;
    }

    const requiresSchoolSelection = selectedRole === 'director' || schools.length > 0;
    if (requiresSchoolSelection && !selectedSchoolId) {
      setErrorMessage(t('sistema.selecionar_escola'));
      setLoading(false);
      return;
    }

    if (selectedRole === 'director' && !paymentDone) {
      setErrorMessage('Conclua o pagamento do plano escolar antes de concluir o registo.');
      setLoading(false);
      return;
    }

    if (selectedSchoolId) {
      ensureSchoolTrial(selectedSchoolId);
    }

    try {
      const { data, error } = await withTimeout(supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: { data: { full_name: normalizedName } }
      }), 12000, 'Self-register timeout');

      if (error) {
        setErrorMessage(error.message || t('mensagens.erro_generico'));
        setLoading(false);
        return;
      }

      const isDirectorAutoApproved = selectedRole === 'director' && paymentDone;
      const isOperationalAutoApproved = selectedRole === 'scanner' || selectedRole === 'parent';

      const pendingUser = {
        id: data?.user?.id || `pending-${Date.now()}`,
        auth_id: data?.user?.id || null,
        nome: normalizedName,
        email: normalizedEmail,
        perfil: selectedRole === 'parent' ? 'pai' : selectedRole === 'teacher' ? 'professor' : selectedRole === 'scanner' ? 'scanner' : 'director',
        escola_id: selectedSchoolId || null,
        senha: normalizedPassword,
        is_active: isDirectorAutoApproved || isOperationalAutoApproved,
        status: (isDirectorAutoApproved || isOperationalAutoApproved) ? 'active' : 'pending',
        password_changed: false,
        source: 'supabase'
      };

      const { error: insertError } = await withTimeout(supabase.from('utilizadores').insert({
        auth_id: data?.user?.id || null,
        nome: pendingUser.nome,
        email: pendingUser.email,
        perfil: pendingUser.perfil,
        escola_id: pendingUser.escola_id,
        telefone: null,
        senha: normalizedPassword,
        status: pendingUser.status,
        is_active: pendingUser.is_active
      }), 12000, 'Registration profile timeout');

      const isLocalFallbackApproval = Boolean(insertError && isPermissionDeniedError(insertError) && selectedRole !== 'director');

      if (isDirectorAutoApproved || isOperationalAutoApproved || isLocalFallbackApproval) {
        const approvedUser = {
          ...pendingUser,
          status: 'active',
          is_active: true,
        };
        const existingApproved = readLocalApprovedUsers();
        const nextApproved = [
          ...existingApproved.filter((item) => String(item?.email || '').trim().toLowerCase() !== normalizedEmail),
          { ...approvedUser, source: insertError ? 'local' : 'supabase' },
        ];
        localStorage.setItem(LOCAL_APPROVED_USERS_KEY, JSON.stringify(nextApproved));
      } else {
        const existingPending = JSON.parse(localStorage.getItem('eduguard_pending_registrations') || '[]');
        existingPending.push({ ...pendingUser, source: insertError ? 'local' : 'supabase' });
        localStorage.setItem('eduguard_pending_registrations', JSON.stringify(existingPending));
      }

      setRegisterMode(false);
      setInfoMessage((isDirectorAutoApproved || isOperationalAutoApproved || isLocalFallbackApproval)
        ? 'Registo concluido com sucesso. Ja pode iniciar sessao no School Security.'
        : t('sistema.registo_pendente'));
      setPassword('');
      setFullName('');
      setSelectedRole('director');
      setSelectedSchoolId('');
      setBillingCycle('monthly');
      setPaymentDone(false);
      setPaymentSummary(null);
    } catch (err: any) {
      if (err instanceof NetworkTimeoutError) {
        setErrorMessage('Tempo excedido ao ligar ao servidor. Tente novamente.');
        return;
      }
      console.error(err);
      setErrorMessage(err?.message || t('mensagens.erro_generico'));
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolPayment = () => {
    if (!selectedSchoolId) {
      setErrorMessage(t('sistema.selecionar_escola'));
      return;
    }

    const selectedSchool = schools.find((school) => school.id === selectedSchoolId);
    const cfg = cycleConfig[billingCycle];
    const normalizedPhone = paymentPhone.replace(/\s+/g, "").trim();

    if (!normalizedPhone || normalizedPhone.length < 9) {
      setErrorMessage(t('sistema.pagamento_numero_obrigatorio'));
      return;
    }

    if (!awaitingPin) {
      setAwaitingPin(true);
      setInfoMessage(`${t('sistema.pedido_pagamento_enviado')} ${normalizedPhone}. ${t('sistema.inserir_pin_confirmar')}`);
      setErrorMessage(null);
      return;
    }

    if (paymentPin.trim().length < 4) {
      setErrorMessage(t('sistema.pin_invalido'));
      return;
    }

    const paidAt = new Date();
    const validUntil = new Date(paidAt.getTime() + cfg.days * 24 * 60 * 60 * 1000).toISOString();

    const list = readSchoolSubscriptions();
    const next: SchoolSubscription = {
      schoolId: selectedSchoolId,
      cycle: billingCycle,
      status: "active",
      amountMzn: cfg.amountMzn,
      paidAt: paidAt.toISOString(),
      validUntil,
      provider: paymentProvider,
      phone: normalizedPhone
    };

    const idx = list.findIndex((item) => item.schoolId === selectedSchoolId);
    if (idx >= 0) list[idx] = next;
    else list.push(next);
    writeSchoolSubscriptions(list);

    setPaymentDone(true);
    setAwaitingPin(false);
    setPaymentPin("");
    setErrorMessage(null);
    setPaymentSummary(`${selectedSchool?.nome || "Escola"} | ${t(`sistema.billing_${billingCycle}`)} | ${cfg.amountMzn.toLocaleString()} MZN | ${paymentProvider.toUpperCase()} ${normalizedPhone} | ${t('sistema.validade_ate')}: ${new Date(validUntil).toLocaleDateString()}`);
    setInfoMessage(t('sistema.pagamento_registado'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500 blur-3xl opacity-20"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500 blur-3xl opacity-20"></div>

      <div className="w-full max-w-md card p-8 z-10 relative">
        
        <div className="flex justify-between items-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl shadow-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="ml-auto">
            <LanguageSelectorCompact />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center">EduGuard360</h2>
        <div className="mt-2 text-center">
          <p className="text-sm text-[#9bbbc9]">{t('sistema.title')} · {t('sistema.login')}</p>
          <p className="mt-2 text-xs text-[#85a7b8]">
            Entrada unica: apos login, o sistema redireciona automaticamente para o portal certo com base nas permissoes.
          </p>
          <details className="mt-2 text-left mx-auto max-w-[320px]">
            <summary className="cursor-pointer text-xs text-[#9bbbc9]">Perfil esperado (opcional, para diagnostico)</summary>
            <div className="pt-2">
              <label className="sr-only" htmlFor="access-profile">{t('sistema.selecionar_perfil_acesso')}</label>
              <select
                id="access-profile"
                value={accessProfile}
                onChange={(e) => setAccessProfile(e.target.value as AccessProfile)}
                className="w-full rounded-xl px-3 py-2 outline-none transition-all bg-[#0f2a3d] text-white border border-[#2e5a6e]"
              >
                {accessProfileOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </details>
        </div>

        <div className="mt-8 space-y-4">
          {registerMode ? (
            <>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                type="text"
                placeholder={t('sistema.nome_completo')}
                className="w-full rounded-xl px-4 py-3 outline-none transition-all"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder={t('sistema.email')}
                className="w-full rounded-xl px-4 py-3 outline-none transition-all"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder={t('sistema.senha')}
                className="w-full rounded-xl px-4 py-3 outline-none transition-all"
              />
              <label className="sr-only" htmlFor="registration-role">{t('sistema.role_director')}</label>
              <select
                id="registration-role"
                value={selectedRole}
                onChange={(e) => {
                  const nextRole = e.target.value;
                  setSelectedRole(nextRole);
                  if (nextRole !== "director") {
                    setPaymentDone(false);
                    setPaymentSummary(null);
                  }
                }}
                className="w-full rounded-xl px-4 py-3 outline-none transition-all bg-[#0f2a3d] text-white"
              >
                <option value="director">{t('sistema.role_director')}</option>
                <option value="parent">{t('sistema.role_parent')}</option>
                <option value="teacher">{t('sistema.role_teacher')}</option>
                <option value="scanner">Segurança QR Code</option>
              </select>
              <label className="sr-only" htmlFor="registration-school">{t('sistema.selecionar_escola')}</label>
              <select
                id="registration-school"
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="w-full rounded-xl px-4 py-3 outline-none transition-all bg-[#0f2a3d] text-white"
                disabled={loadingSchools}
              >
                <option value="">{loadingSchools ? t('botoes.carregando') : t('sistema.selecionar_escola')}</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>{school.nome}</option>
                ))}
              </select>
              {!loadingSchools && schools.length === 0 && (
                <button
                  type="button"
                  onClick={loadSchools}
                  className="inline-flex items-center justify-center rounded-lg border border-[#2e5a6e] px-3 py-2 text-xs font-semibold text-[#d1e4ef] hover:bg-[#12344a]"
                >
                  Tentar novamente
                </button>
              )}
              {!loadingSchools && schools.length === 0 && selectedRole !== 'director' && (
                <p className="text-xs text-[#9bbbc9]">
                  Sem escolas disponiveis no momento. Pode continuar o registo e o administrador ira associar a escola depois.
                </p>
              )}

              {selectedRole === "director" && (
                <div className="rounded-xl border border-[#2e5a6e] bg-[#102c3f] p-3 text-sm text-[#d1e4ef]">
                  <p className="font-semibold mb-2">{t('sistema.pagamento_escola_titulo')}</p>
                  <p className="text-xs text-[#9bbbc9] mb-2">{t('sistema.pagamento_escola_plans')}</p>
                  <select
                    value={paymentProvider}
                    onChange={(e) => {
                      setPaymentProvider(e.target.value as "mpesa" | "emola");
                      setPaymentDone(false);
                      setAwaitingPin(false);
                      setPaymentPin("");
                    }}
                    aria-label="Provedor de pagamento"
                    className="w-full rounded-xl px-4 py-3 outline-none transition-all bg-[#0f2a3d] text-white"
                  >
                    <option value="mpesa">M-Pesa</option>
                    <option value="emola">eMola</option>
                  </select>
                  <select
                    value={billingCycle}
                    onChange={(e) => {
                      setBillingCycle(e.target.value as BillingCycle);
                      setPaymentDone(false);
                      setPaymentSummary(null);
                    }}
                    aria-label="Ciclo de pagamento"
                    className="w-full rounded-xl px-4 py-3 outline-none transition-all bg-[#0f2a3d] text-white"
                  >
                    <option value="monthly">{t('sistema.billing_monthly')} - {cycleConfig.monthly.amountMzn.toLocaleString()} MZN</option>
                    <option value="quarterly">{t('sistema.billing_quarterly')} - {cycleConfig.quarterly.amountMzn.toLocaleString()} MZN</option>
                    <option value="annual">{t('sistema.billing_annual')} - {cycleConfig.annual.amountMzn.toLocaleString()} MZN</option>
                  </select>
                  <input
                    value={paymentPhone}
                    onChange={(e) => {
                      setPaymentPhone(e.target.value);
                      setPaymentDone(false);
                    }}
                    type="tel"
                    placeholder={t('sistema.telefone_pagamento')}
                    className="mt-2 w-full rounded-xl px-4 py-3 outline-none transition-all bg-[#0f2a3d] text-white border border-[#2e5a6e]"
                  />
                  {awaitingPin && (
                    <input
                      value={paymentPin}
                      onChange={(e) => setPaymentPin(e.target.value)}
                      type="password"
                      placeholder={t('sistema.pin_pagamento')}
                      className="mt-2 w-full rounded-xl px-4 py-3 outline-none transition-all bg-[#0f2a3d] text-white border border-[#2e5a6e]"
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleSchoolPayment}
                    className="mt-2 w-full rounded-xl bg-emerald-500/90 px-4 py-2 font-semibold text-[#042b21] hover:bg-emerald-400 transition-colors"
                  >
                    {awaitingPin ? t('sistema.confirmar_com_pin') : t('sistema.btn_pagar_plano')}
                  </button>
                  {paymentSummary && (
                    <p className="mt-2 text-xs text-emerald-300">{paymentSummary}</p>
                  )}
                </div>
              )}
              <button
                onClick={handleSelfRegister}
                disabled={loading}
                className="btn w-full px-4 py-3.5 font-semibold shadow-lg transition-all hover:-translate-y-0.5 mt-2"
              >
                {loading ? t('botoes.carregando') : t('sistema.registrar')}
              </button>
            </>
          ) : (
            <>
              <input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setAccountStatusPanel(null);
                }}
                type="email"
                placeholder={t('sistema.email')}
                className="w-full rounded-xl px-4 py-3 outline-none transition-all"
              />

              {!recoveryMode && (
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder={t('sistema.senha')}
                  className="w-full rounded-xl px-4 py-3 outline-none transition-all"
                />
              )}

              {!recoveryMode && (
                <button
                  type="button"
                  onClick={handleCheckAccountStatus}
                  disabled={checkingAccountStatus || loading}
                  className="w-full rounded-xl border border-[#2e5a6e] px-4 py-2 text-sm font-semibold text-[#d1e4ef] hover:bg-[#12344a] transition-colors"
                >
                  {checkingAccountStatus ? 'A verificar estado da conta...' : 'Verificar estado da conta'}
                </button>
              )}

              <button
                onClick={recoveryMode ? handlePasswordRecovery : handleLogin}
                disabled={loading}
                className="btn w-full px-4 py-3.5 font-semibold shadow-lg transition-all hover:-translate-y-0.5 mt-2"
              >
                {loading
                  ? t('botoes.carregando')
                  : recoveryMode
                    ? t('sistema.enviar_link_recuperacao')
                    : t('sistema.entrar')}
              </button>

              {accountStatusPanel && !recoveryMode && (
                <div className={`mt-2 rounded-xl border px-4 py-3 text-sm ${
                  accountStatusPanel.tone === 'ok'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                    : accountStatusPanel.tone === 'error'
                      ? 'border-red-500/30 bg-red-500/10 text-red-100'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                }`}>
                  <p className="font-semibold">{accountStatusPanel.title}</p>
                  <p className="mt-1 text-xs opacity-90">{accountStatusPanel.summary}</p>
                  <div className="mt-2 space-y-1 text-xs">
                    {accountStatusPanel.items.map((item) => (
                      <p key={`${item.label}-${item.value}`} className={`${
                        item.tone === 'ok'
                          ? 'text-emerald-200'
                          : item.tone === 'error'
                            ? 'text-red-200'
                            : item.tone === 'warn'
                              ? 'text-amber-200'
                              : 'text-sky-100'
                      }`}>
                        <strong>{item.label}:</strong> {item.value}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between text-sm text-[#9bbbc9] mt-2">
            <button
              type="button"
              onClick={() => {
                setRecoveryMode(false);
                setRegisterMode(false);
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              className="rounded-lg bg-[#1ac77c]/90 px-3 py-1 font-semibold text-[#032b1c] hover:bg-[#34d18d] transition-colors"
            >
              {recoveryMode ? t('sistema.voltar_login') : t('sistema.esqueceu_senha')}
            </button>
            {!recoveryMode && (
              <button
                type="button"
                onClick={() => {
                  setRegisterMode(!registerMode);
                  setErrorMessage(null);
                  setInfoMessage(null);
                }}
                className="rounded-lg bg-[#1ac77c]/90 px-3 py-1 font-semibold text-[#032b1c] hover:bg-[#34d18d] transition-colors"
              >
                {registerMode ? t('sistema.voltar_login') : t('sistema.registrar')}
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="mt-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-100">
              {errorMessage}
            </div>
          )}

          {infoMessage && (
            <div className="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-100">
              {infoMessage}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const SystemLogin = () => (
  <SystemAuthProvider>
    <SystemLoginContent />
  </SystemAuthProvider>
);

export default SystemLogin;

