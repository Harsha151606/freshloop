// ──────────────────────────────────────────────
// FreshLoop AI — LocalStorage Persistence Store
// ──────────────────────────────────────────────
// Client-side state management with localStorage
// persistence. Separates data-access from UI so
// it can be replaced with Supabase later.

import type {
  AppState,
  DemoUser,
  FoodListing,
  RescueRequest,
  PickupAssignment,
  ImpactRecord,
  Organization,
  UserRole,
} from './types';
import {
  seedUsers,
  seedOrganizations,
  createSeedListings,
  createSeedRescues,
  createSeedImpact,
} from './seed-data';
import { generateId, estimateMeals, estimateCO2Saved, getSafeDate } from './utils';

const STORE_KEY = 'freshloop-ai-demo-state';

// ── State Initialization ──────────────────────

function getDefaultState(): AppState {
  return {
    currentUser: null,
    users: seedUsers,
    organizations: seedOrganizations,
    foodListings: createSeedListings(),
    rescueRequests: createSeedRescues(),
    pickupAssignments: [],
    impactRecords: createSeedImpact(),
    isInitialized: true,
    lastUpdated: getSafeDate().toISOString(),
  };
}

let memoryState: AppState | null = null;

function loadState(): AppState {
  if (memoryState) return memoryState;

  if (typeof window === 'undefined') {
    memoryState = getDefaultState();
    return memoryState;
  }
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.isInitialized) {
        memoryState = parsed;
        return memoryState;
      }
    }
  } catch {
    // Corrupted state — reset
  }
  memoryState = getDefaultState();
  saveState(memoryState);
  return memoryState;
}

function saveState(state: AppState): void {
  memoryState = state;
  if (typeof window === 'undefined') return;
  state.lastUpdated = getSafeDate().toISOString();
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    console.error('Failed to persist state to localStorage');
  }
}

// ── Event system for state changes ────────────

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  listeners.forEach((fn) => fn());
}

// ── Public API ────────────────────────────────

export function getState(): AppState {
  return loadState();
}

export function resetDemo(): void {
  const state = getDefaultState();
  saveState(state);
  notify();
}

// ── User / Auth ───────────────────────────────

export function setCurrentUser(user: DemoUser | null): void {
  const state = loadState();
  state.currentUser = user;
  saveState(state);
  notify();
}

export function getCurrentUser(): DemoUser | null {
  return loadState().currentUser;
}

// ── Organizations ─────────────────────────────

export function getOrganizations(): Organization[] {
  return loadState().organizations;
}

export function getOrganization(id: string): Organization | undefined {
  if (!id) return undefined;
  return loadState().organizations.find((o) => o.id === id);
}

/**
 * Creates a browser-local organization profile for a newly authenticated donor
 * or recipient when there is not yet a persisted Supabase organization record.
 * The id is stable per account so locally created listings use the same owner.
 *
 * This is localStorage-backed scaffolding, not shared server-side persistence.
 */
export function ensureAccountOrganization(params: {
  userId: string;
  organizationId?: string | null;
  organizationName?: string | null;
  role: UserRole;
}): string | null {
  if (params.role !== 'donor' && params.role !== 'recipient') return null;

  const organizationId = params.organizationId?.trim() || `account-org-${params.userId}`;
  const state = loadState();
  const existing = state.organizations.find((organization) => organization.id === organizationId);
  if (existing) return organizationId;

  const organization: Organization = {
    id: organizationId,
    name: params.organizationName?.trim() || 'My Organization',
    type: params.role === 'donor' ? 'restaurant' : 'ngo',
    address: 'Not provided',
    area: 'Not provided',
    city: 'Not provided',
    contactPhone: '',
    categories: [],
    storageCapabilities: [],
    maxCapacityKg: 0,
    operatingHours: 'Not specified',
    isVerified: false,
  };

  saveState({
    ...state,
    organizations: [...state.organizations, organization],
  });
  notify();
  return organizationId;
}

export function getRecipientOrgs(): Organization[] {
  return loadState().organizations.filter(
    (o) => o.type === 'ngo' || o.type === 'community_kitchen' || o.type === 'food_bank'
  );
}

export function getDonorOrgs(): Organization[] {
  return loadState().organizations.filter(
    (o) => o.type === 'restaurant' || o.type === 'grocery' || o.type === 'caterer' || o.type === 'hostel'
  );
}

// ── Food Listings ─────────────────────────────

export function getFoodListings(): FoodListing[] {
  return loadState().foodListings;
}

export function getFoodListing(id: string): FoodListing | undefined {
  return loadState().foodListings.find((l) => l.id === id);
}

export function getDonorListings(donorId: string): FoodListing[] {
  return loadState().foodListings.filter((l) => l.donorId === donorId);
}

export function getActiveListings(): FoodListing[] {
  return loadState().foodListings.filter(
    (l) => l.status === 'posted' || l.status === 'partially_claimed'
  );
}

export function addFoodListing(
  listing: Omit<FoodListing, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'availableQuantity'>
): FoodListing {
  const state = loadState();
  const now = getSafeDate().toISOString();
  const newListing: FoodListing = {
    ...listing,
    id: `listing-${generateId()}`,
    availableQuantity: listing.quantity,
    status: 'posted',
    createdAt: now,
    updatedAt: now,
  };
  saveState({
    ...state,
    foodListings: [newListing, ...state.foodListings],
  });
  notify();
  return newListing;
}

export function updateListingStatus(id: string, status: FoodListing['status']): void {
  const state = loadState();
  const now = getSafeDate().toISOString();
  const updated = state.foodListings.map((l) =>
    l.id === id ? { ...l, status, updatedAt: now } : l
  );
  saveState({
    ...state,
    foodListings: updated,
  });
  notify();
}

// ── Rescue Requests ───────────────────────────

export function getRescueRequests(): RescueRequest[] {
  return loadState().rescueRequests;
}

export function getRescueRequest(id: string): RescueRequest | undefined {
  return loadState().rescueRequests.find((r) => r.id === id);
}

export function getRescuesForListing(listingId: string): RescueRequest[] {
  return loadState().rescueRequests.filter((r) => r.listingId === listingId);
}

export function getRescuesForRecipient(recipientId: string): RescueRequest[] {
  return loadState().rescueRequests.filter((r) => r.recipientId === recipientId);
}

export function createRescueRequest(params: {
  listingId: string;
  recipientId: string;
  recipientOrgId: string;
  quantity: number;
  matchScore: number;
  matchExplanation: string;
}): RescueRequest | { error: string } {
  const state = loadState();
  const listing = state.foodListings.find((l) => l.id === params.listingId);

  if (!listing) return { error: 'Listing not found.' };
  if (listing.status === 'expired' || listing.status === 'cancelled') {
    return { error: 'This listing is no longer available.' };
  }
  if (params.quantity <= 0) {
    return { error: 'Requested quantity must be greater than zero.' };
  }
  if (params.quantity > listing.availableQuantity) {
    return { error: `Only ${listing.availableQuantity} ${listing.unit} available.` };
  }

  // Prevent duplicate active rescues from same recipient for same listing
  const existing = state.rescueRequests.find(
    (r) =>
      r.listingId === params.listingId &&
      r.recipientId === params.recipientId &&
      r.status !== 'cancelled' &&
      r.status !== 'delivered'
  );
  if (existing) {
    return { error: 'You already have an active rescue for this listing.' };
  }

  const now = getSafeDate().toISOString();
  const rescue: RescueRequest = {
    id: `rescue-${generateId()}`,
    listingId: params.listingId,
    recipientId: params.recipientId,
    recipientOrgId: params.recipientOrgId,
    quantity: params.quantity,
    status: 'accepted',
    matchScore: params.matchScore,
    matchExplanation: params.matchExplanation,
    acceptedAt: now,
    pickupScheduledAt: null,
    collectedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    cancellationReason: null,
    volunteerId: null,
    createdAt: now,
    updatedAt: now,
  };

  const remaining = listing.availableQuantity - params.quantity;
  const newStatus: FoodListing['status'] = remaining <= 0 ? 'fully_claimed' : 'partially_claimed';

  const updatedListings = state.foodListings.map((l) =>
    l.id === listing.id
      ? { ...l, availableQuantity: Math.max(0, remaining), status: newStatus, updatedAt: now }
      : l
  );

  saveState({
    ...state,
    foodListings: updatedListings,
    rescueRequests: [rescue, ...state.rescueRequests],
  });
  notify();
  return rescue;
}

export function updateRescueStatus(
  rescueId: string,
  status: RescueRequest['status'],
  extra?: { cancellationReason?: string; volunteerId?: string }
): RescueRequest | undefined {
  const state = loadState();
  const rescue = state.rescueRequests.find((r) => r.id === rescueId);
  if (!rescue) return undefined;

  const now = getSafeDate().toISOString();
  const updatedRescue: RescueRequest = {
    ...rescue,
    status,
    updatedAt: now,
  };

  let updatedImpactRecords = [...state.impactRecords];
  let updatedListings = [...state.foodListings];

  switch (status) {
    case 'pickup_scheduled':
      updatedRescue.pickupScheduledAt = now;
      if (extra?.volunteerId) updatedRescue.volunteerId = extra.volunteerId;
      break;
    case 'collected':
      updatedRescue.collectedAt = now;
      break;
    case 'delivered':
      updatedRescue.deliveredAt = now;
      // Prevent duplicate impact records for the same rescue
      const alreadyHasImpact = updatedImpactRecords.some((i) => i.rescueRequestId === rescue.id);
      const listing = state.foodListings.find((l) => l.id === rescue.listingId);
      if (listing && !alreadyHasImpact) {
        const impact: ImpactRecord = {
          id: `impact-${generateId()}`,
          rescueRequestId: rescue.id,
          listingId: listing.id,
          donorOrgId: listing.organizationId,
          recipientOrgId: rescue.recipientOrgId,
          foodName: listing.foodName,
          category: listing.category,
          quantityKg: rescue.quantity,
          estimatedMeals: estimateMeals(rescue.quantity, listing.category),
          estimatedCO2SavedKg: estimateCO2Saved(rescue.quantity),
          completedAt: now,
        };
        updatedImpactRecords = [impact, ...updatedImpactRecords];
      }
      break;
    case 'cancelled':
      // Only restore inventory if it wasn't previously cancelled or delivered
      if (rescue.status !== 'cancelled' && rescue.status !== 'delivered') {
        updatedRescue.cancelledAt = now;
        updatedRescue.cancellationReason = extra?.cancellationReason || 'Cancelled by user';
        updatedListings = updatedListings.map((l) => {
          if (l.id !== rescue.listingId) return l;
          const restoredQty = Math.min(l.quantity, l.availableQuantity + rescue.quantity);
          const restoredStatus: FoodListing['status'] =
            restoredQty >= l.quantity ? 'posted' : 'partially_claimed';
          return {
            ...l,
            availableQuantity: restoredQty,
            status: restoredStatus,
            updatedAt: now,
          };
        });
      }
      break;
  }

  const updatedRescues = state.rescueRequests.map((r) =>
    r.id === rescueId ? updatedRescue : r
  );

  saveState({
    ...state,
    rescueRequests: updatedRescues,
    foodListings: updatedListings,
    impactRecords: updatedImpactRecords,
  });
  notify();
  return updatedRescue;
}

// ── Impact Records ────────────────────────────

export function getImpactRecords(): ImpactRecord[] {
  return loadState().impactRecords;
}

export function getImpactSummary() {
  const records = getImpactRecords();
  return {
    totalRescues: records.length,
    totalFoodKg: records.reduce((sum, r) => sum + r.quantityKg, 0),
    totalMeals: records.reduce((sum, r) => sum + r.estimatedMeals, 0),
    totalCO2Saved: records.reduce((sum, r) => sum + r.estimatedCO2SavedKg, 0),
    byCategory: records.reduce(
      (acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + r.quantityKg;
        return acc;
      },
      {} as Record<string, number>
    ),
    byDonor: records.reduce(
      (acc, r) => {
        acc[r.donorOrgId] = (acc[r.donorOrgId] || 0) + r.quantityKg;
        return acc;
      },
      {} as Record<string, number>
    ),
    byRecipient: records.reduce(
      (acc, r) => {
        acc[r.recipientOrgId] = (acc[r.recipientOrgId] || 0) + r.quantityKg;
        return acc;
      },
      {} as Record<string, number>
    ),
    records,
  };
}

// ── Pickup Assignments ────────────────────────

export function getPickupAssignments(): PickupAssignment[] {
  return loadState().pickupAssignments;
}

export function createPickupAssignment(params: {
  rescueRequestId: string;
  volunteerId: string;
  scheduledPickupTime: string;
  notes: string;
}): PickupAssignment {
  const state = loadState();
  const now = getSafeDate().toISOString();
  const assignment: PickupAssignment = {
    id: `pickup-${generateId()}`,
    rescueRequestId: params.rescueRequestId,
    volunteerId: params.volunteerId,
    scheduledPickupTime: params.scheduledPickupTime,
    actualPickupTime: null,
    deliveryTime: null,
    notes: params.notes,
    status: 'assigned',
    createdAt: now,
  };

  const updatedRescues = state.rescueRequests.map((r) =>
    r.id === params.rescueRequestId
      ? {
          ...r,
          status: 'pickup_scheduled' as const,
          pickupScheduledAt: params.scheduledPickupTime,
          volunteerId: params.volunteerId,
          updatedAt: now,
        }
      : r
  );

  saveState({
    ...state,
    pickupAssignments: [assignment, ...state.pickupAssignments],
    rescueRequests: updatedRescues,
  });
  notify();
  return assignment;
}

export function updatePickupAssignment(
  id: string,
  status: PickupAssignment['status']
): void {
  const state = loadState();
  const assignment = state.pickupAssignments.find((a) => a.id === id);
  if (!assignment) return;

  const now = getSafeDate().toISOString();
  const updatedAssignment: PickupAssignment = {
    ...assignment,
    status,
    actualPickupTime: status === 'picked_up' ? now : assignment.actualPickupTime,
    deliveryTime: status === 'delivered' ? now : assignment.deliveryTime,
  };

  const updatedAssignments = state.pickupAssignments.map((a) =>
    a.id === id ? updatedAssignment : a
  );

  saveState({
    ...state,
    pickupAssignments: updatedAssignments,
  });

  if (status === 'picked_up') {
    updateRescueStatus(assignment.rescueRequestId, 'collected');
  } else if (status === 'delivered') {
    updateRescueStatus(assignment.rescueRequestId, 'delivered');
  } else {
    notify();
  }
}

// ── Users ─────────────────────────────────────

export function getUsers(): DemoUser[] {
  return loadState().users;
}

export function getUser(id: string): DemoUser | undefined {
  return loadState().users.find((u) => u.id === id);
}
