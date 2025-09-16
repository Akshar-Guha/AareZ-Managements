import { create } from 'zustand';
import type { StateCreator } from 'zustand';
import API from '@/lib/api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<User | void>;
  logout: () => Promise<void>;
}

const useAuthStore: StateCreator<AuthState> = (set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      console.group('CheckAuth Process');
      console.log('Starting authentication check');
      
      try {
        const user = await API.get<User>('/auth/me');
        console.log('Raw API response for /auth/me:', user);
        
        console.log('CheckAuth result:', {
          userFound: !!user,
          userDetails: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          } : null
        });
        
        set({ user, isAuthenticated: !!user, isLoading: false });
      } catch (apiError: any) {
        // Handle specific error scenarios
        console.error('Auth check API error:', apiError);
        
        // Check for specific error responses
        const errorDetails = apiError.response?.data || {};
        const errorMessage = errorDetails.details || 'Authentication failed';
        const suggestedAction = errorDetails.suggestedAction || 'Please log in';
        
        console.warn('Authentication Error Details:', {
          message: errorMessage,
          suggestedAction,
          fullError: apiError
        });
        
        // Clear any existing authentication state
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
      }
      
      console.groupEnd();
    } catch (error) {
      console.group('CheckAuth Unexpected Error');
      console.error('Unexpected auth check error:', error);
      
      // Fallback error handling
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      });
      
      console.groupEnd();
    }
  },

  login: async (email: string, password: string) => {
    const loginId = `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${loginId}] 🔐 FRONTEND LOGIN STARTED`);
    console.log(`[${loginId}] 📧 Email: ${email}`);
    console.log(`[${loginId}] 🔑 Password: [PROVIDED] (length: ${password?.length || 0})`);

    try {
      console.log(`[${loginId}] 🌐 Making API call to /auth/login`);
      console.log(`[${loginId}] 📨 Request payload:`, { email, password: '[REDACTED]' });

      // Call auth login (helper adds the /api prefix)
      const user = await API.post<User>('/auth/login', { email, password });

      console.log(`[${loginId}] ✅ API Response received:`, {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        role: user?.role,
        hasAllFields: !!(user?.id && user?.name && user?.email && user?.role)
      });

      console.log(`[${loginId}] 💾 Updating Zustand store`);
      set({
        user,
        isAuthenticated: true,
        isLoading: false
      });

      console.log(`[${loginId}] 🎉 LOGIN SUCCESSFUL - User authenticated`);
      console.log(`[${loginId}] 📊 Store state after login:`, {
        user: !!user,
        isAuthenticated: true,
        isLoading: false
      });

      // Redirect or additional logic after successful login
      console.log(`[${loginId}] 🔚 FRONTEND LOGIN COMPLETED`);
      return user;
    } catch (error: any) {
      console.error(`[${loginId}] ❌ FRONTEND LOGIN FAILED:`, {
        error: error?.message || String(error),
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        responseData: error?.response?.data,
        stack: error?.stack
      });

      console.log(`[${loginId}] 🧹 Clearing store state due to login failure`);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false
      });

      console.log(`[${loginId}] 🚨 THROWING ERROR TO COMPONENT`);
      throw error;
    }
  },

  logout: async () => {
    try {
      await API.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },
});

export const useAuth = create(useAuthStore);