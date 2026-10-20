'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  SupabaseUser,
  identifyOrRegisterUser,
  logSupabaseActivity,
  isSupabaseConfigured
} from '@/lib/supabaseClient';

interface UserIdentificationContextType {
  user: SupabaseUser | null;
  isLoading: boolean;
  error: string | null;
  identify: (email: string) => Promise<{ success: boolean; user?: SupabaseUser | null; isNew?: boolean; error?: string }>;
  logout: () => void;
  trackActivity: (action: string, metadata?: Record<string, any>) => Promise<void>;
  isConfigured: boolean;
}

const UserIdentificationContext = createContext<UserIdentificationContextType | undefined>(undefined);

const STORAGE_KEY = 'linkpulse_supabase_user';

export function UserIdentificationProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore stored session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SupabaseUser;
        setUser(parsed);
        // Track PAGE_VIEW event for restored session
        logSupabaseActivity(parsed.id, 'PAGE_VIEW', {
          path: typeof window !== 'undefined' ? window.location.pathname : '/',
          type: 'session_restored'
        });
      }
    } catch (e) {
      console.warn('Failed to parse stored user identification:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const identify = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);

    const result = await identifyOrRegisterUser(email);

    if (result.success && result.user) {
      setUser(result.user);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
      } catch {}

      // Log login activity to Supabase
      await logSupabaseActivity(result.user.id, result.isNew ? 'USER_REGISTERED' : 'USER_LOGIN', {
        email: result.user.email,
        isNew: result.isNew,
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        timestamp: new Date().toISOString()
      });

      setIsLoading(false);
      return result;
    } else {
      setError(result.error || 'Failed to identify user.');
      setIsLoading(false);
      return result;
    }
  }, []);

  const logout = useCallback(() => {
    if (user?.id) {
      logSupabaseActivity(user.id, 'USER_LOGOUT', {
        email: user.email,
        timestamp: new Date().toISOString()
      });
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    setUser(null);
    setError(null);
  }, [user]);

  const trackActivity = useCallback(async (action: string, metadata: Record<string, any> = {}) => {
    if (!user?.id) return;
    await logSupabaseActivity(user.id, action, metadata);
  }, [user]);

  return (
    <UserIdentificationContext.Provider
      value={{
        user,
        isLoading,
        error,
        identify,
        logout,
        trackActivity,
        isConfigured: isSupabaseConfigured
      }}
    >
      {children}
    </UserIdentificationContext.Provider>
  );
}

export function useUserIdentification() {
  const context = useContext(UserIdentificationContext);
  if (!context) {
    throw new Error('useUserIdentification must be used within a UserIdentificationProvider');
  }
  return context;
}
