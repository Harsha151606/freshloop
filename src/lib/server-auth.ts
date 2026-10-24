// ──────────────────────────────────────────────
// FreshLoop AI — Server-Side Auth & Authorization
// ──────────────────────────────────────────────

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import type { UserRole } from './types';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId: string | null;
  organizationName: string | null;
  phone: string | null;
  avatarInitials: string;
}

export async function getServerUser() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }
  return user;
}

export async function getServerProfile(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profile) {
    return {
      id: profile.id,
      email: profile.email || user.email || '',
      fullName: profile.full_name,
      role: profile.role as UserRole,
      organizationId: profile.organization_id,
      organizationName: profile.organization_name,
      phone: profile.phone,
      avatarInitials: profile.avatar_initials || 'FL',
    };
  }

  // Fallback to user metadata if profile row hasn't synced yet
  const meta = user.user_metadata || {};
  const metaRole = (['donor', 'recipient', 'volunteer'].includes(meta.role) ? meta.role : 'donor') as UserRole;
  return {
    id: user.id,
    email: user.email || '',
    fullName: meta.full_name || user.email?.split('@')[0] || 'User',
    role: metaRole,
    organizationId: null,
    organizationName: meta.organization_name || null,
    phone: meta.phone || null,
    avatarInitials: (meta.full_name || 'FL').slice(0, 2).toUpperCase(),
  };
}

export async function requireAuth(redirectTo = '/login') {
  const user = await getServerUser();
  if (!user) {
    redirect(redirectTo);
  }
  return user;
}

export async function requireRole(allowedRoles: UserRole[], redirectTo = '/dashboard') {
  const user = await requireAuth();
  const profile = await getServerProfile();

  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect(redirectTo);
  }
  return { user, profile };
}

export async function signOutAction() {
  'use server';
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  await supabase.auth.signOut();
  redirect('/login');
}
