import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSelectorCompact } from "@/components/LanguageSelector";

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

const SystemLogin = () => {
  const { t } = useLanguage();
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
        if (!error) setSchools((data || []) as Array<{ id: string; nome: string }>);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSchools(false);
      }
    };

    loadSchools();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const validAdminPasswords = [
      "EduGuard@360!2026",
      "Admin1234admin",
      "Admin@1234"
    ];

    try {
      // Bypass automático (Hardcoded) para o Admin Principal
      if (normalizedEmail === "admin@eduguard360.co.mz" && validAdminPasswords.includes(normalizedPassword)) {
        const adminUser = {
          id: "bypass-admin-id",
          nome: "Administrador Global",
          email: "admin@eduguard360.co.mz",
          perfil: "admin",
          escola_id: null,
          canAccessParent: true,
          canAccessSchool: true
        };
        localStorage.setItem("currentUser", JSON.stringify(adminUser));
        navigate("/admin");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (error || !data.user) {
        setErrorMessage(t('sistema.erro_login'));
        return;
      }

      const userId = data.user.id;
      
      // Buscar utilizador na NOVA tabela "utilizadores" criada no Supabase
      const { data: user } = await supabase
        .from("utilizadores")
        .select("*")
        .eq("auth_id", userId)
        .single();

      if (!user) {
        setErrorMessage(t('sistema.erro_login'));
        return;
      }

      const isPending = user.status === 'pending' || user.status === 'inactive' || user.is_active === false;
      if (isPending) {
        setErrorMessage(t('sistema.registo_pendente'));
        return;
      }

      const perfil = String(user.perfil || '').toLowerCase();
      if (accessProfile === 'director' && perfil !== 'director' && perfil !== 'admin') {
        setErrorMessage(t('sistema.perfil_nao_autorizado'));
        return;
      }
      if (accessProfile === 'parent' && perfil !== 'pai' && perfil !== 'admin') {
        setErrorMessage(t('sistema.perfil_nao_autorizado'));
        return;
      }
      if (accessProfile === 'teacher' && perfil !== 'professor' && perfil !== 'teacher' && perfil !== 'admin') {
        setErrorMessage(t('sistema.perfil_nao_autorizado'));
        return;
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
          return;
        }

        if (trialActive && !subscriptionActive) {
          setInfoMessage(`${t('sistema.trial_ativo_ate')}: ${new Date(trial.validUntil).toLocaleDateString()}`);
        }
      }

      // Guardar utilizador logado no contexto/localStorage
      localStorage.setItem("currentUser", JSON.stringify(user));

      // Redirecionamento por Perfil da nova tabela
      if (user.perfil === "admin") navigate("/admin");
      else if (user.perfil === "director") navigate("/school");
      else if (user.perfil === "pai") navigate("/parent");
      else if (user.perfil === "professor" || user.perfil === "teacher") navigate("/school");
      else if (user.perfil === "scanner") navigate("/scanner");
      else navigate("/");
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
        nome: normalizedName,
        email: normalizedEmail,
        perfil: selectedRole === 'parent' ? 'pai' : selectedRole === 'teacher' ? 'professor' : 'director',
        escola_id: selectedSchoolId || null,
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
        senha: null
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

  const handleDemoAccess = (role: string) => {
    let mockUser: any = null;

    if (role === "scanner") {
      mockUser = {
        id: "demo-scanner",
        perfil: "scanner",
        nome: "Scanner",
        escola_id: "demo-school-id",
        password_changed: true
      };
      localStorage.setItem("currentUser", JSON.stringify(mockUser));
      localStorage.setItem('eduguard_user', JSON.stringify({ id: mockUser.id, name: mockUser.nome, type: 'system_user', role: 'scanner', school_id: mockUser.escola_id, password_changed: true }));
      navigate("/scanner");
      return;
    }
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

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2e5a6e]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#132f3f] text-[#9bbbc9] font-medium tracking-wide text-xs uppercase">Acesso de Demonstração</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3">
            <button 
              onClick={() => handleDemoAccess("scanner")}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-[#1c3b4d] !important border border-[#2e5a6e] hover:bg-[#2e5a6e] transition-colors"
            >
              📷 Segurança QR
            </button>
          </div>
          {infoMessage && (
            <p className="mt-3 text-sm text-yellow-300">{infoMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemLogin;

