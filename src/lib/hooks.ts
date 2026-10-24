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

// Hook to subscribe to store changes
function useStoreData<T>(selector: () => T): T {
  return useSyncExternalStore(
    subscribe,
    selector,
    selector
  );
}

export function useCurrentUser() {
  const user = useStoreData(getCurrentUser);

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
