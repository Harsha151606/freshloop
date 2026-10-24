import test from 'node:test';
import assert from 'node:assert';
import {
  resetDemo,
  addFoodListing,
  createRescueRequest,
  updateRescueStatus,
  getFoodListing,
} from '../src/lib/store';
import { getSafeNow } from '../src/lib/utils';

test('transitions: moves through entire lifecycle (accepted -> pickup_scheduled -> collected -> delivered)', () => {
  resetDemo();
  const baseTime = getSafeNow();
  const listing = addFoodListing({
    donorId: 'donor-user-1',
    organizationId: 'org-donor-1',
    foodName: 'Catering Trays',
    category: 'prepared_meals',
    quantity: 25,
    unit: 'kg',
    preparedAt: new Date(baseTime).toISOString(),
    receivedAt: null,
    expiresAt: new Date(baseTime + 6 * 3600000).toISOString(),
    safePickupDeadline: new Date(baseTime + 4 * 3600000).toISOString(),
    pickupArea: 'Indiranagar',
    storageRequirement: 'hot_holding',
    allergens: [],
    description: '',
  });

  const res = createRescueRequest({
    listingId: listing.id,
    recipientId: 'recipient-user-1',
    recipientOrgId: 'org-ngo-1',
    quantity: 25,
    matchScore: 95,
    matchExplanation: 'Ideal match',
  });
  assert.ok(!('error' in res));
  const rescueId = res.id;
  assert.strictEqual(res.status, 'accepted');
  assert.ok(res.acceptedAt);

  // 1. Schedule pickup
  const scheduled = updateRescueStatus(rescueId, 'pickup_scheduled', {
    volunteerId: 'volunteer-user-1',
  });
  assert.ok(scheduled);
  assert.strictEqual(scheduled.status, 'pickup_scheduled');
  assert.ok(scheduled.pickupScheduledAt);
  assert.strictEqual(scheduled.volunteerId, 'volunteer-user-1');

  // 2. Mark collected (in transit)
  const collected = updateRescueStatus(rescueId, 'collected');
  assert.ok(collected);
  assert.strictEqual(collected.status, 'collected');
  assert.ok(collected.collectedAt);

  // 3. Mark delivered
  const delivered = updateRescueStatus(rescueId, 'delivered');
  assert.ok(delivered);
  assert.strictEqual(delivered.status, 'delivered');
  assert.ok(delivered.deliveredAt);
});

test('transitions: cancellation restores listing inventory and updates status', () => {
  resetDemo();
  const baseTime = getSafeNow();
  const listing = addFoodListing({
    donorId: 'donor-user-1',
    organizationId: 'org-donor-1',
    foodName: 'Bread Loaves',
    category: 'bakery',
    quantity: 15,
    unit: 'kg',
    preparedAt: null,
    receivedAt: null,
    expiresAt: new Date(baseTime + 10 * 3600000).toISOString(),
    safePickupDeadline: new Date(baseTime + 8 * 3600000).toISOString(),
    pickupArea: 'Indiranagar',
    storageRequirement: 'ambient',
    allergens: [],
    description: '',
  });

  const res = createRescueRequest({
    listingId: listing.id,
    recipientId: 'recipient-user-1',
    recipientOrgId: 'org-ngo-1',
    quantity: 15,
    matchScore: 85,
    matchExplanation: 'Match',
  });
  assert.ok(!('error' in res));

  // Listing is now fully claimed
  const claimedListing = getFoodListing(listing.id);
  assert.strictEqual(claimedListing?.availableQuantity, 0);
  assert.strictEqual(claimedListing?.status, 'fully_claimed');

  // Cancel the rescue
  const cancelled = updateRescueStatus(res.id, 'cancelled', {
    cancellationReason: 'Recipient kitchen oven failure',
  });
  assert.ok(cancelled);
  assert.strictEqual(cancelled.status, 'cancelled');
  assert.strictEqual(cancelled.cancellationReason, 'Recipient kitchen oven failure');
  assert.ok(cancelled.cancelledAt);

  // Listing inventory restored
  const restoredListing = getFoodListing(listing.id);
  assert.strictEqual(restoredListing?.availableQuantity, 15);
  assert.strictEqual(restoredListing?.status, 'posted');
});

test('transitions: double cancellation does not restore inventory twice', () => {
  resetDemo();
  const baseTime = getSafeNow();
  const listing = addFoodListing({
    donorId: 'donor-user-1',
    organizationId: 'org-donor-1',
    foodName: 'Salad Bowls',
    category: 'produce',
    quantity: 10,
    unit: 'kg',
    preparedAt: null,
    receivedAt: null,
    expiresAt: new Date(baseTime + 10 * 3600000).toISOString(),
    safePickupDeadline: new Date(baseTime + 8 * 3600000).toISOString(),
    pickupArea: 'Indiranagar',
    storageRequirement: 'refrigerated',
    allergens: [],
    description: '',
  });

  const res = createRescueRequest({
    listingId: listing.id,
    recipientId: 'recipient-user-1',
    recipientOrgId: 'org-ngo-1',
    quantity: 10,
    matchScore: 85,
    matchExplanation: 'Match',
  });
  assert.ok(!('error' in res));

  updateRescueStatus(res.id, 'cancelled', { cancellationReason: 'First cancel' });
  const afterFirst = getFoodListing(listing.id);
  assert.strictEqual(afterFirst?.availableQuantity, 10);

  // Calling cancel again should be an idempotent no-op for inventory restoration
  updateRescueStatus(res.id, 'cancelled', { cancellationReason: 'Second cancel' });
  const afterSecond = getFoodListing(listing.id);
  assert.strictEqual(afterSecond?.availableQuantity, 10);
});
