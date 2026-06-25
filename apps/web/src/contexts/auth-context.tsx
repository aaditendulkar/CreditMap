'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/auth-api';
import type { SafeUser, LoginRequest, RegisterRequest } from '@/types/auth';

interface AuthContextValue {
  user: SafeUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('cm_access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('cm_access_token');
        localStorage.removeItem('cm_refresh_token');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const saveTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('cm_access_token', accessToken);
    localStorage.setItem('cm_refresh_token', refreshToken);
    // Also set a cookie so middleware can detect auth state
    document.cookie = `cm_access_token=${accessToken}; path=/; max-age=${15 * 60}; SameSite=Lax`;
  };

  const clearTokens = () => {
    localStorage.removeItem('cm_access_token');
    localStorage.removeItem('cm_refresh_token');
    document.cookie = 'cm_access_token=; path=/; max-age=0';
  };

  const login = useCallback(async (data: LoginRequest): Promise<void> => {
    const res = await authApi.login(data);
    saveTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    router.push('/dashboard');
  }, [router]);

  const register = useCallback(async (data: RegisterRequest): Promise<void> => {
    const res = await authApi.register(data);
    saveTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      clearTokens();
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
