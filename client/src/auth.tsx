// Guarda quién inició sesión, para que todas las pantallas lo sepan.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, setToken, type AppConfig, type User } from './api';

interface AuthState {
  user: User | null;
  config: AppConfig | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    api<AppConfig>('/config').then(setConfig).catch(() => {});
    if (getToken()) {
      api<{ user: User }>('/me')
        .then((r) => setUser(r.user))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    const onLogout = () => setUser(null);
    window.addEventListener('ft:logout', onLogout);
    return () => window.removeEventListener('ft:logout', onLogout);
  }, []);

  const login = useCallback((token: string, u: User) => { setToken(token); setUser(u); }, []);
  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  return (
    <AuthContext.Provider value={{ user, config, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fuera de AuthProvider');
  return ctx;
}
