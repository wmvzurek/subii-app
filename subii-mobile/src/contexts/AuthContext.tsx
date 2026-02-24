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

// WKLEJ TO przed linią: export function AuthProvider(...)
const AUTHENTICATED_ROUTES = [
  'subscriptions-add', 'subscriptions-select-plan', 'subscriptions-manage',
  'subscription-detail', 'titles', 'person', 'change-password', 'terms',
  'help', 'watched-list', 'billing-setup', 'reset-password', 'forgot-password',
];

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
   if (!isAuthenticated && inAuthGroup) {
      router.replace('/login' as any);
   } else if (isAuthenticated && !inAuthGroup && !AUTHENTICATED_ROUTES.includes(segments[0] || ''))
  router.replace('/(tabs)' as any);
}
  }, [isAuthenticated, segments, isLoading, navigationState?.key]);

  const login = async (token: string, user: any) => {
    await storage.setToken(token);
    await storage.setUser(user);
    setIsAuthenticated(true);
    // Zarejestruj push token po zalogowaniu
    try {
      const { registerForPushNotifications } = await import("../lib/pushNotifications");
      await registerForPushNotifications();
    } catch (e) {
      console.warn("[push] Nie udało się zarejestrować:", e);
    }
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