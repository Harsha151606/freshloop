'use client';

// ──────────────────────────────────────────────
// FreshLoop AI — Unified Auth Context (Supabase + Demo)
// ──────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getCurrentUser, setCurrentUser as storeSetCurrentUser } from '@/lib/store';
import type { UserRole } from './types';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId?: string | null;
  organizationName?: string | null;
  avatarInitials: string;
  isDemo: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isDemo: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setDemoUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isDemo: false,
  signOut: async () => {},
  refreshUser: async () => {},
  setDemoUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const loadProfile = useCallback(async (userId: string, email: string, meta: Record<string, unknown> = {}) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        return {
          id: profile.id,
          email: profile.email || email,
          fullName: profile.full_name || email.split('@')[0],
          role: profile.role as UserRole,
          organizationId: profile.organization_id,
          organizationName: profile.organization_name,
          avatarInitials: profile.avatar_initials || 'FL',
          isDemo: false,
        };
      }
    } catch {
      // Fallback to auth metadata
    }

    const metaRole = (['donor', 'recipient', 'volunteer'].includes(meta.role as string)
      ? meta.role
      : 'donor') as UserRole;

    const fullName = (meta.full_name as string) || email.split('@')[0] || 'User';
    return {
      id: userId,
      email,
      fullName,
      role: metaRole,
      organizationId: null,
      organizationName: (meta.organization_name as string) || null,
      avatarInitials: fullName.slice(0, 2).toUpperCase(),
      isDemo: false,
    };
  }, [supabase]);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { user: sbUser } } = await supabase.auth.getUser();
      if (sbUser) {
        const profile = await loadProfile(sbUser.id, sbUser.email || '', sbUser.user_metadata);
        setUser(profile);
        setIsLoading(false);
        return;
      }
    } catch {
      // Network or unconfigured Supabase
    }

    // Check demo user in local store
    const demo = getCurrentUser();
    if (demo) {
      setUser({
        id: demo.id,
        email: demo.email,
        fullName: demo.name,
        role: demo.role,
        organizationId: demo.organizationId,
        avatarInitials: demo.avatarInitials,
        isDemo: true,
      });
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [supabase, loadProfile]);

  useEffect(() => {
    let isMounted = true;

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        const profile = await loadProfile(session.user.id, session.user.email || '', session.user.user_metadata);
        if (isMounted) {
          setUser(profile);
          setIsLoading(false);
        }
      } else {
        const demo = getCurrentUser();
        if (isMounted) {
          if (demo) {
            setUser({
              id: demo.id,
              email: demo.email,
              fullName: demo.name,
              role: demo.role,
              organizationId: demo.organizationId,
              avatarInitials: demo.avatarInitials,
              isDemo: true,
            });
          } else {
            setUser(null);
          }
          setIsLoading(false);
        }
      }
    });

    // Initial load
    void (async () => {
      try {
        const { data: { user: sbUser } } = await supabase.auth.getUser();
        if (!isMounted) return;
        if (sbUser) {
          const profile = await loadProfile(sbUser.id, sbUser.email || '', sbUser.user_metadata);
          if (isMounted) {
            setUser(profile);
            setIsLoading(false);
          }
          return;
        }
      } catch {
        // Fallback
      }

      if (!isMounted) return;
      const demo = getCurrentUser();
      if (demo) {
        setUser({
          id: demo.id,
          email: demo.email,
          fullName: demo.name,
          role: demo.role,
          organizationId: demo.organizationId,
          avatarInitials: demo.avatarInitials,
          isDemo: true,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    storeSetCurrentUser(null);
    setUser(null);
    setIsLoading(false);
    router.push('/login');
  }, [supabase, router]);

  const setDemoUser = useCallback((u: AuthUser | null) => {
    if (u) {
      storeSetCurrentUser({
        id: u.id,
        name: u.fullName,
        email: u.email,
        role: u.role,
        organizationId: u.organizationId || 'org-1',
        avatarInitials: u.avatarInitials,
      });
      setUser(u);
    } else {
      storeSetCurrentUser(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isDemo: user?.isDemo ?? false,
        signOut,
        refreshUser,
        setDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
