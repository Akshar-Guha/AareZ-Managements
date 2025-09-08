import { createContext, useContext, useEffect, useState } from 'react';
import { API } from '@/lib/api';

export type User = { id: number; name: string; email: string; role: 'admin' | 'mr' } | null;

const AuthCtx = createContext<{
  user: User;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}>({ user: null, loading: true, login: async () => {}, register: async () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get<User>('/auth/me').then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const u = await API.post<User>('/auth/login', { email, password });
    setUser(u);
  };
  const register = async (name: string, email: string, password: string) => {
    const u = await API.post<User>('/auth/register', { name, email, password });
    setUser(u);
  };
  const logout = async () => { await API.post('/auth/logout'); setUser(null); };

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() { return useContext(AuthCtx); }
