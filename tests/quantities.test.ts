import test from 'node:test';
import assert from 'node:assert';
import {
  resetDemo,
  addFoodListing,
  createRescueRequest,
  getFoodListing,
} from '../src/lib/store';
import { getSafeNow } from '../src/lib/utils';

test('quantities: cannot request zero or negative quantity', () => {
  resetDemo();
  const baseTime = getSafeNow();
  const listing = addFoodListing({
    donorId: 'donor-user-1',
    organizationId: 'org-donor-1',
    foodName: 'Fresh Soup',
    category: 'prepared_meals',
    quantity: 20,
    unit: 'kg',
    preparedAt: new Date(baseTime).toISOString(),
    receivedAt: null,
    expiresAt: new Date(baseTime + 5 * 3600000).toISOString(),
    safePickupDeadline: new Date(baseTime + 4 * 3600000).toISOString(),
    pickupArea: 'Indiranagar',
    storageRequirement: 'hot_holding',
    allergens: [],
    description: '',
  });

  const resZero = createRescueRequest({
    listingId: listing.id,
    recipientId: 'recipient-user-1',
    recipientOrgId: 'org-ngo-1',
    quantity: 0,
    matchScore: 85,
    matchExplanation: 'Test match',
  });
  assert.ok('error' in resZero);
  assert.strictEqual(resZero.error, 'Requested quantity must be greater than zero.');

  const resNegative = createRescueRequest({
    listingId: listing.id,
    recipientId: 'recipient-user-1',
    recipientOrgId: 'org-ngo-1',
    quantity: -5,
    matchScore: 85,
    matchExplanation: 'Test match',
  });
  assert.ok('error' in resNegative);
  assert.strictEqual(resNegative.error, 'Requested quantity must be greater than zero.');
});

test('quantities: cannot accept more food than is available', () => {
  resetDemo();
  const baseTime = getSafeNow();
  const listing = addFoodListing({
    donorId: 'donor-user-1',
    organizationId: 'org-donor-1',
    foodName: 'Rice Boxes',
    category: 'prepared_meals',
    quantity: 10,
    unit: 'kg',
    preparedAt: new Date(baseTime).toISOString(),
    receivedAt: null,
    expiresAt: new Date(baseTime + 5 * 3600000).toISOString(),
    safePickupDeadline: new Date(baseTime + 4 * 3600000).toISOString(),
    pickupArea: 'Indiranagar',
    storageRequirement: 'hot_holding',
    allergens: [],
    description: '',
  });

  const result = createRescueRequest({
    listingId: listing.id,
    recipientId: 'recipient-user-1',
    recipientOrgId: 'org-ngo-1',
    quantity: 15,
    matchScore: 80,
    matchExplanation: 'Test match',
  });

  assert.ok('error' in result);
  assert.ok(result.error.includes('Only 10 kg available'));
});

test('quantities: partial claim updates remaining quantity and status to partially_claimed', () => {
  resetDemo();
  const baseTime = getSafeNow();
  const listing = addFoodListing({
    donorId: 'donor-user-1',
    organizationId: 'org-donor-1',
    foodName: 'Mixed Pastries',
    category: 'bakery',
    quantity: 20,
    unit: 'kg',
    preparedAt: null,
    receivedAt: null,
    expiresAt: new Date(baseTime + 8 * 3600000).toISOString(),
    safePickupDeadline: new Date(baseTime + 6 * 3600000).toISOString(),
    pickupArea: 'Indiranagar',
    storageRequirement: 'ambient',
    allergens: [],
    description: '',
  });

  const res = createRescueRequest({
    listingId: listing.id,
    recipientId: 'recipient-user-1',
    recipientOrgId: 'org-ngo-1',
    quantity: 8,
    matchScore: 90,
    matchExplanation: 'Test match',
  });

  assert.ok(!('error' in res));
  const updatedListing = getFoodListing(listing.id);
  assert.ok(updatedListing);
  assert.strictEqual(updatedListing.availableQuantity, 12);
  assert.strictEqual(updatedListing.status, 'partially_claimed');
});

test('quantities: full claim sets available quantity to zero and status to fully_claimed', () => {
  resetDemo();
  const baseTime = getSafeNow();
  const listing = addFoodListing({
    donorId: 'donor-user-1',
    organizationId: 'org-donor-1',
    foodName: 'Apples',
    category: 'produce',
    quantity: 10,
    unit: 'kg',
    preparedAt: null,
    receivedAt: null,
    expiresAt: new Date(baseTime + 24 * 3600000).toISOString(),
    safePickupDeadline: new Date(baseTime + 20 * 3600000).toISOString(),
    pickupArea: 'Indiranagar',
    storageRequirement: 'ambient',
    allergens: [],
    description: '',
  });

  const res = createRescueRequest({
    listingId: listing.id,
    recipientId: 'recipient-user-1',
    recipientOrgId: 'org-ngo-1',
    quantity: 10,
    matchScore: 90,
    matchExplanation: 'Test match',
  });

  assert.ok(!('error' in res));
  const updatedListing = getFoodListing(listing.id);
  assert.ok(updatedListing);
  assert.strictEqual(updatedListing.availableQuantity, 0);
  assert.strictEqual(updatedListing.status, 'fully_claimed');
});

test('quantities: prevents duplicate active acceptance by same recipient for same listing', () => {
  resetDemo();
  const baseTime = getSafeNow();
  const listing = addFoodListing({
    donorId: 'donor-user-1',
    organizationId: 'org-donor-1',
    foodName: 'Surplus Milk',
    category: 'dairy',
    quantity: 30,
    unit: 'kg',
    preparedAt: null,
    receivedAt: null,
    expiresAt: new Date(baseTime + 12 * 3600000).toISOString(),
    safePickupDeadline: new Date(baseTime + 10 * 3600000).toISOString(),
    pickupArea: 'Indiranagar',
    storageRequirement: 'refrigerated',
    allergens: ['dairy'],
    description: '',
  });

  // First request succeeds
  const first = createRescueRequest({
    listingId: listing.id,
    recipientId: 'recipient-user-1',
    recipientOrgId: 'org-ngo-1',
    quantity: 10,
    matchScore: 90,
    matchExplanation: 'First claim',
  });
  assert.ok(!('error' in first));

  // Second duplicate request fails
  const second = createRescueRequest({
    listingId: listing.id,
    recipientId: 'recipient-user-1',
    recipientOrgId: 'org-ngo-1',
    quantity: 5,
    matchScore: 90,
    matchExplanation: 'Duplicate claim',
  });
  assert.ok('error' in second);
  assert.strictEqual(second.error, 'You already have an active rescue for this listing.');
});
