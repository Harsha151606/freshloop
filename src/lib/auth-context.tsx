'use client';

// ──────────────────────────────────────────────
// FreshLoop AI — Unified Auth Context (Supabase + Demo)
// ──────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ensureAccountOrganization, getCurrentUser, setCurrentUser as storeSetCurrentUser } from '@/lib/store';
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

  const loadProfile = useCallback(async (
    userId: string,
    email: string,
    meta: Record<string, unknown> = {}
  ): Promise<AuthUser> => {
    let profile: Record<string, unknown> | null = null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) profile = data as Record<string, unknown>;
    } catch {
      // A profile table/row may not exist yet; auth metadata remains the fallback.
    }

    const allowedRoles: UserRole[] = ['donor', 'recipient', 'volunteer', 'admin'];
    const rawRole = profile?.role ?? meta.role;
    const role: UserRole = allowedRoles.includes(rawRole as UserRole)
      ? (rawRole as UserRole)
      : 'donor';

    const fullName =
      (typeof profile?.full_name === 'string' && profile.full_name.trim()) ||
      (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
      email.split('@')[0] ||
      'User';

    const organizationName =
      (typeof profile?.organization_name === 'string' && profile.organization_name.trim()) ||
      (typeof meta.organization_name === 'string' && meta.organization_name.trim()) ||
      null;

    const organizationId =
      typeof profile?.organization_id === 'string' ? profile.organization_id : null;

    // Real accounts need an organization id for listing ownership. Until the
    // database organization/profile tables are wired up, create a stable local
    // organization record instead of leaving the account with a null owner.
    const resolvedOrganizationId =
      role === 'donor' || role === 'recipient'
        ? ensureAccountOrganization({ userId, organizationId, organizationName, role })
        : organizationId;

    const avatarInitials =
      (typeof profile?.avatar_initials === 'string' && profile.avatar_initials) ||
      fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase() ||
      'FL';

    return {
      id: userId,
      email: (typeof profile?.email === 'string' && profile.email) || email,
      fullName,
      role,
      organizationId: resolvedOrganizationId,
      organizationName,
      avatarInitials,
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
