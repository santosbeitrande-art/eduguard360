import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSelectorCompact } from "@/components/LanguageSelector";
import { SystemAuthProvider, useSystemAuth } from "@/context/SystemAuthContext";

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

const SCHOOL_SUBSCRIPTIONS_KEY = "eduguard_school_subscriptions";
const SCHOOL_TRIALS_KEY = "eduguard_school_trials";
const LOCAL_APPROVED_USERS_KEY = 'eduguard_locally_approved_users';
const SCHOOLS_CACHE_KEY = 'eduguard_admin_schools_cache';

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

const SystemLoginContent = () => {
  const { t } = useLanguage();
  const { login: edgeLogin } = useSystemAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState("director");
  const [accessProfile, setAccessProfile] = useState("director");
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
  const navigate = useNavigate();

  useEffect(() => {
    const loadSchools = async () => {
      setLoadingSchools(true);
      try {
        const { data, error } = await supabase.from("escolas").select("id,nome").order("nome");
        if (!error && Array.isArray(data) && data.length > 0) {
          const fetchedSchools = (data || []) as Array<{ id: string; nome: string }>;
          setSchools(fetchedSchools);
          writeSchoolsCache(fetchedSchools);
        } else {
          const fallbackSchools = buildFallbackSchoolsFromLocalSources();
          if (fallbackSchools.length > 0) {
            setSchools(fallbackSchools);
          }
        }
      } catch (err) {
        console.error(err);
        const fallbackSchools = buildFallbackSchoolsFromLocalSources();
        if (fallbackSchools.length > 0) {
          setSchools(fallbackSchools);
        }
      } finally {
        setLoadingSchools(false);
      }
    };

    loadSchools();
  }, []);

  const isPendingUser = (user: any): boolean => user?.status === 'pending' || user?.status === 'inactive' || user?.is_active === false;

  const isProfileAllowed = (perfil: string): boolean => {
    if (accessProfile === 'director') return perfil === 'director' || perfil === 'admin';
    if (accessProfile === 'parent') return perfil === 'pai' || perfil === 'admin';
    if (accessProfile === 'teacher') return perfil === 'professor' || perfil === 'teacher' || perfil === 'admin';
    if (accessProfile === 'scanner') return perfil === 'scanner' || perfil === 'admin';
    return true;
  };

  const redirectByProfile = (perfil: string) => {
    if (perfil === 'admin') navigate('/admin');
    else if (perfil === 'director') navigate('/school');
    else if (perfil === 'pai') navigate('/parent');
    else if (perfil === 'professor' || perfil === 'teacher') navigate('/school');
    else if (perfil === 'scanner') navigate('/scanner');
    else navigate('/');
  };

  const persistLegacyUserFromEdgeAuth = (edgeUser: any) => {
    if (!edgeUser) return;

    const legacyPerfil = edgeUser.role === 'super_admin'
      ? 'admin'
      : edgeUser.role === 'school_admin'
        ? 'director'
        : edgeUser.role === 'scanner' || edgeUser.role === 'security'
          ? 'scanner'
          : edgeUser.type === 'parent'
            ? 'pai'
            : edgeUser.role === 'teacher'
              ? 'professor'
              : 'director';

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
    if (!user) {
      setErrorMessage(t('sistema.erro_login'));
      return false;
    }

    if (isPendingUser(user)) {
      setErrorMessage(t('sistema.registo_pendente'));
      return false;
    }

    const perfil = String(user.perfil || '').toLowerCase();
    if (!isProfileAllowed(perfil)) {
      setErrorMessage(t('sistema.perfil_nao_autorizado'));
      return false;
    }

    const schoolId = user.escola_id || null;
    if (schoolId && perfil !== 'admin') {
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

    localStorage.setItem('currentUser', JSON.stringify(user));
    redirectByProfile(perfil);
    return true;
  };

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    try {
      const edgeUserType = accessProfile === 'parent' ? 'parent' : 'system';
      const edgeResult = await edgeLogin(normalizedEmail, normalizedPassword, edgeUserType);
      if (edgeResult.success) {
        const edgeUserRaw = localStorage.getItem('eduguard_user');
        if (edgeUserRaw) {
          try {
            const edgeUser = JSON.parse(edgeUserRaw);
            persistLegacyUserFromEdgeAuth(edgeUser);
            const perfil = edgeUser.role === 'super_admin'
              ? 'admin'
              : edgeUser.role === 'school_admin'
                ? 'director'
                : edgeUser.role === 'scanner' || edgeUser.role === 'security'
                  ? 'scanner'
                  : edgeUser.type === 'parent'
                    ? 'pai'
                    : edgeUser.role === 'teacher'
                      ? 'professor'
                      : 'director';
            redirectByProfile(perfil);
            return;
          } catch (parseError) {
            console.warn('Falha ao ler eduguard_user após edge login', parseError);
          }
        }
      }

      let authData: any = null;
      let authError: any = null;

      const firstSignIn = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      authData = firstSignIn.data;
      authError = firstSignIn.error;

      if (authError || !authData?.user) {
        const { data: domainUserByEmail } = await supabase
          .from("utilizadores")
          .select("*")
          .eq("email", normalizedEmail)
          .maybeSingle();
        const localApprovedUser = readLocalApprovedUsers().find((item) => String(item?.email || '').trim().toLowerCase() === normalizedEmail);

        const canAutoProvisionAuth = Boolean(domainUserByEmail?.id && !domainUserByEmail?.auth_id);

        if (canAutoProvisionAuth) {
          const signUpAttempt = await supabase.auth.signUp({
            email: normalizedEmail,
            password: normalizedPassword,
            options: { data: { source: 'system-login-autoprovision' } }
          });

          const signUpErrorMessage = String(signUpAttempt.error?.message || '');
          if (!signUpAttempt.error || isAlreadyRegisteredError(signUpErrorMessage)) {
            const retrySignIn = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: normalizedPassword,
            });

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
          const { error: setPasswordError } = await supabase
            .from('utilizadores')
            .update({ senha: normalizedPassword })
            .eq('id', domainUserByEmail.id);

          if (!setPasswordError) {
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
          const localPassword = String(localApprovedUser?.senha || '').trim();
          if (localPassword && localPassword === normalizedPassword) {
            const didLogin = completeLogin(localApprovedUser, true);
            if (didLogin) {
              return;
            }
          }
        }
      }

      if (authError || !authData?.user) {
        const authMessage = String(authError?.message || '').toLowerCase();
        if (authMessage.includes('email not confirmed')) {
          setErrorMessage('Email ainda não confirmado. Verifique a sua caixa de entrada para ativar a conta.');
          return;
        }
        setErrorMessage(t('sistema.erro_login'));
        return;
      }

      const userId = authData.user.id;
      
      // Buscar utilizador na tabela "utilizadores". Em bases antigas, auth_id pode estar vazio.
      const { data: userByAuth } = await supabase
        .from("utilizadores")
        .select("*")
        .eq("auth_id", userId)
        .maybeSingle();

      let user = userByAuth;

      if (!user) {
        const { data: userByEmail } = await supabase
          .from("utilizadores")
          .select("*")
          .eq("email", normalizedEmail)
          .maybeSingle();

        user = userByEmail;

        if (user?.id && !user?.auth_id) {
          // Melhor esforço para vincular o auth user à conta de domínio.
          await supabase
            .from("utilizadores")
            .update({ auth_id: userId })
            .eq("id", user.id);

          user = { ...user, auth_id: userId };
        }
      }

      completeLogin(user);
    } catch (err) {
      console.error(err);
      setErrorMessage(t('mensagens.erro_generico'));
    } finally {
      setLoading(false);
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
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/sistema`
      });

      if (error) {
        setErrorMessage(error.message || t('mensagens.erro_generico'));
      } else {
        setInfoMessage(t('sistema.link_recuperacao_enviado'));
        setRecoveryMode(false);
      }
    } catch (err: any) {
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

    if (!selectedSchoolId) {
      setErrorMessage(t('sistema.selecionar_escola'));
      setLoading(false);
      return;
    }

    ensureSchoolTrial(selectedSchoolId);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: { data: { full_name: normalizedName } }
      });

      if (error) {
        setErrorMessage(error.message || t('mensagens.erro_generico'));
        setLoading(false);
        return;
      }

      const pendingUser = {
        id: data?.user?.id || `pending-${Date.now()}`,
        auth_id: data?.user?.id || null,
        nome: normalizedName,
        email: normalizedEmail,
        perfil: selectedRole === 'parent' ? 'pai' : selectedRole === 'teacher' ? 'professor' : selectedRole === 'scanner' ? 'scanner' : 'director',
        escola_id: selectedSchoolId || null,
        senha: normalizedPassword,
        is_active: false,
        status: 'pending',
        password_changed: false,
        source: 'supabase'
      };

      const { error: insertError } = await supabase.from('utilizadores').insert({
        auth_id: data?.user?.id || null,
        nome: pendingUser.nome,
        email: pendingUser.email,
        perfil: pendingUser.perfil,
        escola_id: pendingUser.escola_id,
        telefone: null,
        senha: normalizedPassword
      });

      const existingPending = JSON.parse(localStorage.getItem('eduguard_pending_registrations') || '[]');
      existingPending.push({ ...pendingUser, source: insertError ? 'local' : 'supabase' });
      localStorage.setItem('eduguard_pending_registrations', JSON.stringify(existingPending));

      setRegisterMode(false);
      setInfoMessage(t('sistema.registo_pendente'));
      setPassword('');
      setFullName('');
      setSelectedRole('director');
      setSelectedSchoolId('');
      setBillingCycle('monthly');
      setPaymentDone(false);
      setPaymentSummary(null);
    } catch (err: any) {
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
          <div className="mt-2">
            <label className="sr-only" htmlFor="access-profile">{t('sistema.selecionar_perfil_acesso')}</label>
            <select
              id="access-profile"
              value={accessProfile}
              onChange={(e) => setAccessProfile(e.target.value)}
              className="mx-auto max-w-[280px] rounded-xl px-3 py-2 outline-none transition-all bg-[#0f2a3d] text-white border border-[#2e5a6e]"
            >
              <option value="director">{t('sistema.role_director')}</option>
              <option value="parent">{t('sistema.role_parent')}</option>
              <option value="teacher">{t('sistema.role_teacher')}</option>
              <option value="scanner">Segurança QR Code</option>
            </select>
          </div>
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
                onChange={(e) => setEmail(e.target.value)}
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

