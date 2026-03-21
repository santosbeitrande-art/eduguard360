import { supabase } from '@/lib/supabase';

// Types for API responses
export interface DemoRequest {
  id?: string;
  name: string;
  email: string;
  school: string;
  role: 'director' | 'teacher' | 'parent' | 'other';
  message?: string;
  created_at?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Mock data for testing
const mockDemoRequests: DemoRequest[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@escola.com',
    school: 'Escola Primária Central',
    role: 'director',
    message: 'Interessado em implementar o sistema.',
    created_at: new Date().toISOString(),
  },
];

// Environment check for mocking
const isMockMode = import.meta.env.VITE_MOCK_API === 'true';

// Consolidated API service
export class ApiService {
  // Submit demo request
  static async submitDemoRequest(data: Omit<DemoRequest, 'id' | 'created_at'>): Promise<ApiResponse<DemoRequest>> {
    if (isMockMode) {
      // Mock implementation
      const newRequest: DemoRequest = {
        ...data,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
      };
      mockDemoRequests.push(newRequest);
      return { data: newRequest };
    }

    try {
      const { data: result, error } = await supabase
        .from('demo_requests')
        .insert([{
          ...data,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return { data: result };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get all demo requests (for admin)
  static async getDemoRequests(): Promise<ApiResponse<DemoRequest[]>> {
    if (isMockMode) {
      return { data: mockDemoRequests };
    }

    try {
      const { data, error } = await supabase
        .from('demo_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Authenticate user
  static async signIn(email: string, password: string): Promise<ApiResponse<any>> {
    if (isMockMode) {
      // Mock auth
      if (email === 'admin@eduguard360.co.mz' && password === 'Admin@1234') {
        return { data: { user: { email }, session: { access_token: 'mock_token' } } };
      }
      return { error: 'Invalid credentials' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Login failed' };
    }
  }

  // Sign out
  static async signOut(): Promise<ApiResponse<void>> {
    if (isMockMode) {
      return { data: undefined };
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { data: undefined };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Sign out failed' };
    }
  }

  // Get current user
  static async getCurrentUser(): Promise<ApiResponse<any>> {
    if (isMockMode) {
      return { data: { user: { email: 'mock@eduguard360.co.mz' } } };
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { data: { user } };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to get user' };
    }
  }
}</content>
<parameter name="filePath">c:\Users\AEAO\Desktop\Santos\website-guide eduguard360\src\services\api.ts