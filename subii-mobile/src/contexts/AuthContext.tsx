import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { useRouter, useSegments } from 'expo-router';
import { authApi } from '../lib/api';

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>; // ← DODAJ TO
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await storage.getToken();
      setIsAuthenticated(!!token);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && inAuthGroup) {
      router.replace('/login' as any);
    } else if (isAuthenticated && (segments[0] === 'login' || segments[0] === 'register')) {
      router.replace('/(tabs)' as any);
    }
  }, [isAuthenticated, segments, isLoading]);

  const login = async (token: string, user: any) => {
    await storage.setToken(token);
    await storage.setUser(user);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await storage.clearAuth();
    setIsAuthenticated(false);
  };

  // ← DODAJ TĘ FUNKCJĘ
  const refreshUser = async () => {
    try {
      const freshUser = await authApi.me();
      await storage.setUser(freshUser);
      console.log("✅ User refreshed in AuthContext:", freshUser);
    } catch (error) {
      console.error("❌ Error refreshing user:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}