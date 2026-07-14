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
  /** Sessiya (token) muddati tugab, foydalanuvchi majburan chiqarilganini bildiradi
   * — manual "Chiqish" tugmasidan farqli, Login sahifasi buni ko'rib ogohlantirish chiqaradi. */
  sessionExpired: boolean;
  clearSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "finance_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    setSessionExpired(false);
    clearSession();
  }, [clearSession]);

  const handleUnauthorized = useCallback(() => {
    // Foydalanuvchi allaqachon chiqib ketgan bo'lsa (masalan hali login ekranida),
    // qayta-qayta ogohlantirish ko'rsatmaymiz.
    setUser((current) => {
      if (current) setSessionExpired(true);
      return null;
    });
    clearSession();
  }, [clearSession]);

  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

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
    setOnUnauthorized(handleUnauthorized);
    refreshUser()
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, [refreshUser, clearSession, handleUnauthorized]);

  const login = useCallback(
    async (username: string, password: string) => {
      const { access_token } = await api.auth.login(username, password);
      localStorage.setItem(TOKEN_KEY, access_token);
      setAuthToken(access_token);
      const me = await api.auth.me();
      setUser(me);
      setSessionExpired(false);
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
      sessionExpired,
      clearSessionExpired,
    }),
    [user, loading, login, logout, refreshUser, sessionExpired, clearSessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth AuthProvider ichida ishlatilishi kerak");
  return ctx;
}
