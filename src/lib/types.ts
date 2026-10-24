// ──────────────────────────────────────────────
// FreshLoop AI — Core Data Models
// ──────────────────────────────────────────────

export type UserRole = 'donor' | 'recipient' | 'volunteer' | 'admin';

export type FoodCategory =
  | 'prepared_meals'
  | 'bakery'
  | 'dairy'
  | 'produce'
  | 'packaged'
  | 'beverages'
  | 'frozen'
  | 'other';

export type StorageRequirement = 'ambient' | 'refrigerated' | 'frozen' | 'hot_holding';

export type ListingStatus = 'draft' | 'posted' | 'partially_claimed' | 'fully_claimed' | 'expired' | 'cancelled';

export type RescueStatus =
  | 'pending'
  | 'accepted'
  | 'pickup_scheduled'
  | 'collected'
  | 'delivered'
  | 'cancelled';

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  avatarInitials: string;
  /** Present for authenticated users; demo seed users omit these fields. */
  organizationName?: string | null;
  isDemo?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  type: 'restaurant' | 'grocery' | 'caterer' | 'hostel' | 'ngo' | 'community_kitchen' | 'food_bank';
  address: string;
  area: string;
  city: string;
  contactPhone: string;
  categories: FoodCategory[];
  storageCapabilities: StorageRequirement[];
  maxCapacityKg: number;
  operatingHours: string;
  isVerified: boolean;
}

export interface FoodListing {
  id: string;
  donorId: string;
  organizationId: string;
  foodName: string;
  category: FoodCategory;
  quantity: number;
  unit: string;
  availableQuantity: number;
  preparedAt: string | null;
  receivedAt: string | null;
  expiresAt: string;
  safePickupDeadline: string;
  pickupArea: string;
  storageRequirement: StorageRequirement;
  allergens: string[];
  description: string;
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
}

export interface RescueRequest {
  id: string;
  listingId: string;
  recipientId: string;
  recipientOrgId: string;
  quantity: number;
  status: RescueStatus;
  matchScore: number;
  matchExplanation: string;
  acceptedAt: string | null;
  pickupScheduledAt: string | null;
  collectedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  volunteerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PickupAssignment {
  id: string;
  rescueRequestId: string;
  volunteerId: string;
  scheduledPickupTime: string;
  actualPickupTime: string | null;
  deliveryTime: string | null;
  notes: string;
  status: 'assigned' | 'en_route' | 'picked_up' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface ImpactRecord {
  id: string;
  rescueRequestId: string;
  listingId: string;
  donorOrgId: string;
  recipientOrgId: string;
  foodName: string;
  category: FoodCategory;
  quantityKg: number;
  estimatedMeals: number;
  estimatedCO2SavedKg: number;
  completedAt: string;
}

export interface UrgencyScore {
  listingId: string;
  score: number;
  level: UrgencyLevel;
  reasons: string[];
  timeRemainingMinutes: number;
  isEligible: boolean;
  ineligibilityReason?: string;
}

export interface MatchResult {
  recipientOrgId: string;
  recipientOrgName: string;
  score: number;
  explanation: string;
  isEligible: boolean;
  ineligibilityReason?: string;
  factors: {
    categoryMatch: number;
    capacityMatch: number;
    distanceScore: number;
    storageMatch: number;
    pickupFeasibility: number;
  };
  suggestedAction: string;
}

export interface DecisionRoomItem {
  listing: FoodListing;
  urgency: UrgencyScore;
  topMatch: MatchResult | null;
  currentRescue: RescueRequest | null;
  donorOrg: Organization | undefined;
}

// AI-related types
export interface AIExtractionResult {
  candidates: Partial<FoodListing>[];
  confidence: number;
  warnings: string[];
  rawInput: string;
}

export interface AIPriorityExplanation {
  summary: string;
  details: string;
  generatedAt: string;
  isAIGenerated: boolean;
}

// Store state
export interface AppState {
  currentUser: DemoUser | null;
  users: DemoUser[];
  organizations: Organization[];
  foodListings: FoodListing[];
  rescueRequests: RescueRequest[];
  pickupAssignments: PickupAssignment[];
  impactRecords: ImpactRecord[];
  isInitialized: boolean;
  lastUpdated: string;
}
