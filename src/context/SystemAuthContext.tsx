
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    const type = legacy.perfil === 'pai' ? 'parent' : 'system_user';
    const role = legacy.perfil === 'admin' ? 'super_admin'
      : legacy.perfil === 'director' ? 'school_admin'
      : legacy.perfil === 'scanner' ? 'scanner'
      : legacy.role;

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
      const { data, error } = await supabase.functions.invoke('eduguard-auth', {
        body: { action: 'login', email: cleanEmail, password, user_type: userType, ip_address: 'web-client', user_agent: navigator.userAgent }
      });

      if (data) {
        if (data.success && data.user) {
          setUser(data.user);
          setToken(data.token);
          localStorage.setItem('eduguard_user', JSON.stringify(data.user));
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
      console.warn('Edge function unavailable:', err.message);
    }

    // Demo fallback - only when edge function is unreachable
    const demoEntry = DEMO_USERS[cleanEmail];
    if (demoEntry && demoEntry.password === password) {
      const demoToken = btoa(JSON.stringify({ userId: demoEntry.user.id, type: demoEntry.user.type, role: demoEntry.user.role, exp: Date.now() + 86400000 }));
      setUser(demoEntry.user);
      setToken(demoToken);
      localStorage.setItem('eduguard_user', JSON.stringify(demoEntry.user));
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

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Não autenticado' };
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.functions.invoke('eduguard-auth', {
        body: { action: 'change_password', user_id: user.id, user_type: user.type, current_password: currentPassword, new_password: newPassword, operator_name: user.name }
      });
      if (error) {
        console.error('Change password invoke error:', error);
        return { success: false, error: 'Erro de ligação ao servidor. Tente novamente.' };
      }
      if (data?.success) { updateUser({ password_changed: true }); return { success: true }; }
      if (data?.error) return { success: false, error: data.error };
      return { success: false, error: 'Resposta inesperada do servidor' };
    } catch (err: any) {
      console.error('Change password exception:', err);
      return { success: false, error: 'Erro de ligação. Verifique a sua conexão.' };
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
