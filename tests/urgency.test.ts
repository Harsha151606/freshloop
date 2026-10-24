import test from 'node:test';
import assert from 'node:assert';
import { calculateUrgency, rankListingsByUrgency } from '../src/lib/urgency-engine';
import { getSafeNow } from '../src/lib/utils';
import type { FoodListing } from '../src/lib/types';

function createMockListing(overrides: Partial<FoodListing> = {}): FoodListing {
  const baseTime = getSafeNow();
  return {
    id: 'mock-listing-1',
    donorId: 'donor-1',
    organizationId: 'org-donor',
    foodName: 'Sandwiches',
    category: 'prepared_meals',
    quantity: 15,
    availableQuantity: 15,
    unit: 'kg',
    preparedAt: new Date(baseTime - 3 * 3600000).toISOString(),
    receivedAt: null,
    expiresAt: new Date(baseTime + 4 * 3600000).toISOString(),
    safePickupDeadline: new Date(baseTime + 2 * 3600000).toISOString(),
    pickupArea: 'Indiranagar',
    storageRequirement: 'refrigerated',
    allergens: [],
    description: '',
    status: 'posted',
    createdAt: new Date(baseTime - 3 * 3600000).toISOString(),
    updatedAt: new Date(baseTime - 3 * 3600000).toISOString(),
    ...overrides,
  };
}

test('urgency: expired listing is flagged as ineligible with score 0', () => {
  const baseTime = getSafeNow();
  const expired = createMockListing({
    expiresAt: new Date(baseTime - 3600000).toISOString(),
  });
  const urgency = calculateUrgency(expired);
  assert.strictEqual(urgency.isEligible, false);
  assert.strictEqual(urgency.score, 0);
  assert.ok(urgency.ineligibilityReason?.includes('expired'));
});

test('urgency: past safe pickup deadline is flagged as ineligible', () => {
  const baseTime = getSafeNow();
  const pastPickup = createMockListing({
    safePickupDeadline: new Date(baseTime - 60000).toISOString(),
  });
  const urgency = calculateUrgency(pastPickup);
  assert.strictEqual(urgency.isEligible, false);
  assert.strictEqual(urgency.score, 0);
  assert.ok(urgency.ineligibilityReason?.includes('safe pickup deadline has passed'));
});

test('urgency: less than 1 hour remaining yields maximum time score and critical urgency', () => {
  const baseTime = getSafeNow();
  const imminent = createMockListing({
    expiresAt: new Date(baseTime + 45 * 60000).toISOString(),
    safePickupDeadline: new Date(baseTime + 40 * 60000).toISOString(),
    availableQuantity: 55,
    storageRequirement: 'hot_holding',
  });
  const urgency = calculateUrgency(imminent);
  assert.strictEqual(urgency.isEligible, true);
  assert.ok(urgency.score >= 70, `Expected score >= 70, got ${urgency.score}`);
  assert.strictEqual(urgency.level, 'critical');
  assert.ok(urgency.reasons.some((r) => r.includes('Less than 1 hour remaining')));
});

test('urgency: rankListingsByUrgency orders eligible urgent listings ahead of low urgency', () => {
  const baseTime = getSafeNow();
  const urgent = createMockListing({
    id: 'urgent-item',
    expiresAt: new Date(baseTime + 50 * 60000).toISOString(),
    safePickupDeadline: new Date(baseTime + 40 * 60000).toISOString(),
    availableQuantity: 40,
  });
  const relaxed = createMockListing({
    id: 'relaxed-item',
    expiresAt: new Date(baseTime + 30 * 3600000).toISOString(),
    safePickupDeadline: new Date(baseTime + 28 * 3600000).toISOString(),
    availableQuantity: 5,
    storageRequirement: 'ambient',
    category: 'packaged',
  });
  const expired = createMockListing({
    id: 'expired-item',
    expiresAt: new Date(baseTime - 1000).toISOString(),
  });

  const ranked = rankListingsByUrgency([relaxed, expired, urgent]);
  assert.strictEqual(ranked[0].listing.id, 'urgent-item');
  assert.strictEqual(ranked[1].listing.id, 'relaxed-item');
  assert.strictEqual(ranked[2].listing.id, 'expired-item');
});
