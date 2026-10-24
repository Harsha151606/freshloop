'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  getState,
  subscribe,
  getCurrentUser,
  setCurrentUser as storeSetCurrentUser,
  getFoodListings,
  getRescueRequests,
  getImpactRecords,
  getOrganizations,
  getPickupAssignments,
  getUsers,
} from './store';
import type { DemoUser, AppState } from './types';
import { useAuth } from './auth-context';

// Hook to subscribe to store changes
function useStoreData<T>(selector: () => T): T {
  return useSyncExternalStore(
    subscribe,
    selector,
    selector
  );
}

export function useCurrentUser() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const storedUser = useStoreData(getCurrentUser);

  // The sidebar uses Supabase Auth, while the original pages used only the
  // demo store. Normalize both paths here so every dashboard page sees the
  // same currently authenticated identity.
  const user: DemoUser | null = authUser
    ? {
        id: authUser.id,
        name: authUser.fullName,
        email: authUser.email,
        role: authUser.role,
        organizationId: authUser.organizationId ?? '',
        avatarInitials: authUser.avatarInitials,
        organizationName: authUser.organizationName,
        isDemo: authUser.isDemo,
      }
    : authLoading
      ? null
      : storedUser;

  const setUser = useCallback((u: DemoUser | null) => {
    storeSetCurrentUser(u);
  }, []);

  return { user, setUser };
}

export function useFoodListings() {
  return useStoreData(getFoodListings);
}

export function useRescueRequests() {
  return useStoreData(getRescueRequests);
}

export function useImpactRecords() {
  return useStoreData(getImpactRecords);
}

export function useOrganizations() {
  return useStoreData(getOrganizations);
}

export function usePickupAssignments() {
  return useStoreData(getPickupAssignments);
}

export function useUsers() {
  return useStoreData(getUsers);
}

export function useAppState(): AppState {
  return useStoreData(getState);
}

const emptySubscribe = () => () => {};

// Client-side mounted check (React 19 safe without cascading render)
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
