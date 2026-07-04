import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setAuthToken, setOnUnauthorized } from "../api/client";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "finance_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setAuthToken(null);
      return;
    }
    setAuthToken(token);
    const me = await api.auth.me();
    setUser(me);
  }, []);

  useEffect(() => {
    setOnUnauthorized(logout);
    refreshUser()
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [refreshUser, logout]);

  const login = useCallback(
    async (username: string, password: string) => {
      const { access_token } = await api.auth.login(username, password);
      localStorage.setItem(TOKEN_KEY, access_token);
      setAuthToken(access_token);
      const me = await api.auth.me();
      setUser(me);
    },
    [],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAdmin: user?.role === "admin",
      refreshUser,
    }),
    [user, loading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth AuthProvider ichida ishlatilishi kerak");
  return ctx;
}
