import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, setToken } from '@/lib/api';
import type { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api.auth
      .me()
      .then((r) => setUser(r.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.auth.login({ email, password });
    setToken(r.token);
    setUser(r.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const r = await api.auth.register({ name, email, password });
    setToken(r.token);
    setUser(r.user);
  };

  const logout = () => {
    api.auth.logout().catch(() => undefined);
    setToken(null);
    setUser(null);
  };

  const refresh = async () => {
    try {
      const r = await api.auth.me();
      setUser(r.user);
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
