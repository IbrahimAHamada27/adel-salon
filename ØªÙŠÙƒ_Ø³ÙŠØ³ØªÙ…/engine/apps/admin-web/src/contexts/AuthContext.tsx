'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthStatus } from '@/types/auth';
import { authApi } from '@/services/auth.api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSetupRequired: boolean;
  setupOwner: (data: { name: string; username: string; email?: string; password: string }) => Promise<void>;
  login: (data: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSetupRequired, setIsSetupRequired] = useState<boolean>(false);

  const checkStatusAndSession = useCallback(async () => {
    try {
      // 1. Instant check from localStorage
      let cachedToken: string | null = null;
      let cachedUser: User | null = null;

      if (typeof window !== 'undefined') {
        cachedToken = localStorage.getItem('tech_auth_token');
        const userStr = localStorage.getItem('tech_auth_user');
        if (userStr) {
          try {
            cachedUser = JSON.parse(userStr);
          } catch {}
        }
      }

      if (cachedToken) {
        setToken(cachedToken);
        if (cachedUser) {
          setUser(cachedUser);
        }
      }

      // 2. Fetch server system status with timeout
      const status: AuthStatus = await authApi.getStatus().catch(() => ({ hasOwner: true, isSetupRequired: false }));
      setIsSetupRequired(status.isSetupRequired);

      // 3. If token exists, verify in background
      if (cachedToken) {
        try {
          const me = await authApi.getMe(cachedToken);
          if (me) {
            setUser(me);
            localStorage.setItem('tech_auth_user', JSON.stringify(me));
          }
        } catch (err: any) {
          // If explicitly unauthorized (401), clear
          if (err.message && (err.message.includes('401') || err.message.includes('غير صالحة'))) {
            localStorage.removeItem('tech_auth_token');
            localStorage.removeItem('tech_auth_user');
            setToken(null);
            setUser(null);
          }
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatusAndSession();
  }, [checkStatusAndSession]);

  const setupOwner = async (data: { name: string; username: string; email?: string; password: string }) => {
    const res = await authApi.setupOwner(data);
    localStorage.setItem('tech_auth_token', res.token);
    localStorage.setItem('tech_auth_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    setIsSetupRequired(false);
  };

  const login = async (data: { username: string; password: string }) => {
    const res = await authApi.login(data);
    localStorage.setItem('tech_auth_token', res.token);
    localStorage.setItem('tech_auth_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    setIsLoading(false);
  };

  const logout = async () => {
    if (token) {
      await authApi.logout(token).catch(() => {});
    }
    localStorage.removeItem('tech_auth_token');
    localStorage.removeItem('tech_auth_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isSetupRequired,
        setupOwner,
        login,
        logout,
        refreshAuth: checkStatusAndSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
