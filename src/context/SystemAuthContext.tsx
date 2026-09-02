
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { withTimeout, NetworkTimeoutError } from '@/lib/networkPerformance';
import { normalizeEnterpriseRole } from '@/lib/enterpriseGovernance';

interface Student {
  id: string;
  name: string;
  grade: string;
  class: string;
  relationship?: string;
}

interface Tenant {
  tenant_id: string;
  name: string;
  slug: string;
  plan?: string;
  status?: string;
  max_students?: number;
  max_users?: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  type: 'parent' | 'system_user';
  role?: string;
  school_id?: string;
  students?: Student[];
  phone?: string;
  sms_enabled?: boolean;
  sms_phone?: string;
  email_enabled?: boolean;
  password_changed?: boolean;
  notification_preferences?: any;
  tenant_id?: string;
  tenant?: Tenant | null;
}

interface SystemAuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, userType: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  updateUser: (updates: Partial<User>) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  requiresPasswordChange: boolean;
}

const SystemAuthContext = createContext<SystemAuthContextType | undefined>(undefined);

// Demo fallback disabled for parent/director to enforce real registration + payment policy.
const DEMO_USERS: Record<string, { user: User; password: string }> = {};

export const SystemAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const parseLegacyUser = (legacy: any): User => {
    const role = normalizeEnterpriseRole(legacy?.role || legacy?.perfil);
    const type = role === 'parent' ? 'parent' : 'system_user';

    return {
      id: legacy.id || legacy.auth_id || legacy.user_id || 'legacy-user',
      email: legacy.email || legacy.email || '',
      name: legacy.nome || legacy.name || '',
      type,
      role,
      school_id: legacy.escola_id || legacy.school_id || undefined,
      phone: legacy.phone || undefined,
      sms_enabled: legacy.sms_enabled,
      sms_phone: legacy.sms_phone,
      email_enabled: legacy.email_enabled ?? true,
      password_changed: legacy.password_changed ?? true,
      tenant_id: legacy.tenant_id || undefined,
      tenant: legacy.tenant || null,
    };
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('eduguard_user');
    const storedToken = localStorage.getItem('eduguard_token');

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch (e) {
        localStorage.removeItem('eduguard_user');
        localStorage.removeItem('eduguard_token');
      }
    } else {
      const legacyUser = localStorage.getItem('currentUser');
      if (legacyUser) {
        try {
          setUser(parseLegacyUser(JSON.parse(legacyUser)));
        } catch (e) {
          console.warn('Failed to parse legacy currentUser', e);
        }
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, userType: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    
    // Try edge function first (production)
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await withTimeout(supabase.functions.invoke('eduguard-auth', {
        body: { action: 'login', email: cleanEmail, password, user_type: userType, ip_address: 'web-client', user_agent: navigator.userAgent }
      }), 12000, 'Login timeout');

      if (data) {
        if (data.success && data.user) {
          const normalizedUser = {
            ...data.user,
            role: normalizeEnterpriseRole(data.user?.role || data.user?.perfil),
          };
          setUser(normalizedUser);
          setToken(data.token);
          localStorage.setItem('eduguard_user', JSON.stringify(normalizedUser));
          localStorage.setItem('eduguard_token', data.token);
          return { success: true };
        }
        if (data.error) {
          // DB connection error - fall through to demo
          if (data.error.includes('ligação') || data.error.includes('base de dados')) {
            console.warn('DB connection issue, trying demo fallback');
          } else {
            // Real auth error - return it directly
            return { success: false, error: data.error };
          }
        }
      }
    } catch (err: any) {
      if (err instanceof NetworkTimeoutError) {
        console.warn('Edge function timeout');
      } else {
        console.warn('Edge function unavailable:', err.message);
      }
    }

    // Demo fallback - only when edge function is unreachable
    const demoEntry = DEMO_USERS[cleanEmail];
    if (demoEntry && demoEntry.password === password) {
      const normalizedUser = {
        ...demoEntry.user,
        role: normalizeEnterpriseRole(demoEntry.user?.role),
      };
      const demoToken = btoa(JSON.stringify({ userId: normalizedUser.id, type: normalizedUser.type, role: normalizedUser.role, exp: Date.now() + 86400000 }));
      setUser(normalizedUser);
      setToken(demoToken);
      localStorage.setItem('eduguard_user', JSON.stringify(normalizedUser));
      localStorage.setItem('eduguard_token', demoToken);
      return { success: true };
    }

    return { success: false, error: 'Credenciais inválidas. Verifique o email e a palavra-passe.' };
  };

  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('eduguard_user'); localStorage.removeItem('eduguard_token');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) { const updated = { ...user, ...updates }; setUser(updated); localStorage.setItem('eduguard_user', JSON.stringify(updated)); }
  };

  const updateLocalPasswordCaches = (email: string, newPassword: string) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    const currentUserRaw = localStorage.getItem('currentUser');
    if (currentUserRaw) {
      try {
        const currentUser = JSON.parse(currentUserRaw);
        if (String(currentUser?.email || '').trim().toLowerCase() === normalizedEmail) {
          localStorage.setItem('currentUser', JSON.stringify({
            ...currentUser,
            senha: newPassword,
            password_changed: true,
          }));
        }
      } catch {
        // Ignore local cache parse errors to avoid blocking password update.
      }
    }

    const approvedRaw = localStorage.getItem('eduguard_locally_approved_users');
    if (approvedRaw) {
      try {
        const approved = JSON.parse(approvedRaw);
        if (Array.isArray(approved)) {
          const next = approved.map((item: any) => {
            const itemEmail = String(item?.email || '').trim().toLowerCase();
            if (itemEmail !== normalizedEmail) return item;
            return {
              ...item,
              senha: newPassword,
              password_changed: true,
            };
          });
          localStorage.setItem('eduguard_locally_approved_users', JSON.stringify(next));
        }
      } catch {
        // Ignore local cache parse errors to avoid blocking password update.
      }
    }
  };

  const getCachedPasswordForUser = (email: string): string | null => {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    try {
      const currentUserRaw = localStorage.getItem('currentUser');
      const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
      if (String(currentUser?.email || '').trim().toLowerCase() === normalizedEmail && String(currentUser?.senha || '').trim()) {
        return String(currentUser.senha).trim();
      }
    } catch {
      // Ignore local cache parse errors.
    }

    try {
      const approvedRaw = localStorage.getItem('eduguard_locally_approved_users');
      const approved = approvedRaw ? JSON.parse(approvedRaw) : [];
      if (Array.isArray(approved)) {
        const found = approved.find((item: any) => String(item?.email || '').trim().toLowerCase() === normalizedEmail);
        if (String(found?.senha || '').trim()) {
          return String(found.senha).trim();
        }
      }
    } catch {
      // Ignore local cache parse errors.
    }

    return null;
  };

  const tryDirectDomainPasswordUpdate = async (email: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const normalizedEmail = String(email || '').trim().toLowerCase();

      const { data: domainUser, error: fetchError } = await withTimeout(
        supabase
          .from('utilizadores')
          .select('id, email, senha, status, is_active')
          .eq('email', normalizedEmail)
          .maybeSingle(),
        12000,
        'Direct password fetch timeout'
      );

      if (fetchError || !domainUser?.id) {
        return { success: false, error: 'Conta nao encontrada para atualizar palavra-passe.' };
      }

      const storedPassword = String(domainUser?.senha || '').trim();
      if (storedPassword && storedPassword !== String(currentPassword || '').trim()) {
        return { success: false, error: 'Palavra-passe atual incorreta.' };
      }

      const { error: updateError } = await withTimeout(
        supabase
          .from('utilizadores')
          .update({ senha: newPassword })
          .eq('id', domainUser.id),
        12000,
        'Direct password update timeout'
      );

      if (updateError) {
        return { success: false, error: 'Nao foi possivel atualizar a palavra-passe na base de dados.' };
      }

      updateLocalPasswordCaches(normalizedEmail, newPassword);
      updateUser({ password_changed: true });
      return { success: true };
    } catch (err) {
      if (err instanceof NetworkTimeoutError) {
        return { success: false, error: 'Tempo excedido ao atualizar palavra-passe. Tente novamente.' };
      }
      return { success: false, error: 'Falha ao atualizar palavra-passe no servidor.' };
    }
  };

  const tryLocalPasswordUpdate = (email: string, currentPassword: string, newPassword: string): { success: boolean; error?: string } => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const cachedPassword = getCachedPasswordForUser(normalizedEmail);

    if (cachedPassword && String(currentPassword || '').trim() !== cachedPassword) {
      return { success: false, error: 'Palavra-passe atual incorreta.' };
    }

    if (!cachedPassword) {
      return { success: false, error: 'Nao foi possivel validar a palavra-passe atual em modo offline.' };
    }

    updateLocalPasswordCaches(normalizedEmail, newPassword);
    updateUser({ password_changed: true });
    return { success: true };
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Não autenticado' };

    const normalizedEmail = String(user.email || '').trim().toLowerCase();
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await withTimeout(supabase.functions.invoke('eduguard-auth', {
        body: { action: 'change_password', user_id: user.id, user_type: user.type, current_password: currentPassword, new_password: newPassword, operator_name: user.name }
      }), 12000, 'Password change timeout');
      if (error) {
        console.error('Change password invoke error:', error);
        const directFallback = await tryDirectDomainPasswordUpdate(normalizedEmail, currentPassword, newPassword);
        if (directFallback.success) return { success: true };

        const localFallback = tryLocalPasswordUpdate(normalizedEmail, currentPassword, newPassword);
        if (localFallback.success) return { success: true };

        return { success: false, error: directFallback.error || localFallback.error || 'Erro de ligação ao servidor. Tente novamente.' };
      }
      if (data?.success) {
        updateLocalPasswordCaches(normalizedEmail, newPassword);
        updateUser({ password_changed: true });
        return { success: true };
      }
      if (data?.error) return { success: false, error: data.error };
      return { success: false, error: 'Resposta inesperada do servidor' };
    } catch (err: any) {
      if (err instanceof NetworkTimeoutError) {
        const directFallback = await tryDirectDomainPasswordUpdate(normalizedEmail, currentPassword, newPassword);
        if (directFallback.success) return { success: true };

        const localFallback = tryLocalPasswordUpdate(normalizedEmail, currentPassword, newPassword);
        if (localFallback.success) return { success: true };

        return { success: false, error: directFallback.error || localFallback.error || 'Tempo excedido ao ligar ao servidor. Tente novamente.' };
      }
      console.error('Change password exception:', err);
      const directFallback = await tryDirectDomainPasswordUpdate(normalizedEmail, currentPassword, newPassword);
      if (directFallback.success) return { success: true };

      const localFallback = tryLocalPasswordUpdate(normalizedEmail, currentPassword, newPassword);
      if (localFallback.success) return { success: true };

      return { success: false, error: directFallback.error || localFallback.error || 'Erro de ligação. Verifique a sua conexão.' };
    }
  };

  const requiresPasswordChange = !!user && user.password_changed === false;

  return (
    <SystemAuthContext.Provider value={{ user, token, isLoading, login, logout, isAuthenticated: !!user, updateUser, changePassword, requiresPasswordChange }}>
      {children}
    </SystemAuthContext.Provider>
  );
};

export const useSystemAuth = () => {
  const context = useContext(SystemAuthContext);
  if (context === undefined) throw new Error('useSystemAuth must be used within a SystemAuthProvider');
  return context;
};
