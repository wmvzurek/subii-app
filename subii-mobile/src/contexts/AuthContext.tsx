import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../lib/storage';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { authApi } from '../lib/api';

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // W DEV MODE zawsze wyloguj przy starcie
      if (__DEV__) {
        console.log("🔥 DEV MODE - Force logout on app start");
        await storage.clearAuth();
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // W PRODUCTION sprawdź normalnie
      const token = await storage.getToken();
      const user = await storage.getUser();
      
      if (!token || !user) {
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Poczekaj aż nawigacja będzie gotowa
    if (!navigationState?.key || isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (!isAuthenticated && inAuthGroup) {
      // Nie zalogowany próbuje wejść do chronionej części
      router.replace('/login' as any);
    } else if (isAuthenticated && !inAuthGroup && !['subscriptions-add', 'subscriptions-select-plan', 'subscriptions-manage'].includes(segments[0] || '')) {
      // Zalogowany jest na login/register - przekieruj do głównej
      router.replace('/(tabs)' as any);
    }
  }, [isAuthenticated, segments, isLoading, navigationState?.key]);

  const login = async (token: string, user: any) => {
    await storage.setToken(token);
    await storage.setUser(user);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await storage.clearAuth();
    setIsAuthenticated(false);
    router.replace('/login' as any);
  };

  const refreshUser = async () => {
    try {
      const freshUser = await authApi.me();
      await storage.setUser(freshUser);
      console.log("✅ User refreshed in AuthContext:", freshUser);
    } catch (error) {
      console.error("❌ Error refreshing user:", error);
    }
  };

  // Podczas ładowania pokaż splash screen
  if (isLoading) {
    return null; // Expo pokaże domyślny splash
  }

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