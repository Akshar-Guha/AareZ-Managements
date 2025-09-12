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
  login: (email: string, password: string) => Promise<void>;
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
    set({ isLoading: true });
    try {
      const user = await API.post<User>('/auth/login', { email, password });
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('Login failed:', error);
      set({ isLoading: false });
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