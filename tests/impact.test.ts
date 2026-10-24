import test from 'node:test';
import assert from 'node:assert';
import {
  resetDemo,
  addFoodListing,
  createRescueRequest,
  updateRescueStatus,
  getImpactRecords,
  getImpactSummary,
} from '../src/lib/store';
import { estimateMeals, estimateCO2Saved, getSafeNow } from '../src/lib/utils';

test('impact: estimateMeals calculates category-specific meal outputs correctly', () => {
  assert.strictEqual(estimateMeals(10, 'prepared_meals'), 25); // 2.5 * 10
  assert.strictEqual(estimateMeals(10, 'bakery'), 30); // 3 * 10
  assert.strictEqual(estimateMeals(10, 'dairy'), 20); // 2 * 10
  assert.strictEqual(estimateMeals(10, 'produce'), 20); // 2 * 10
  assert.strictEqual(estimateMeals(10, 'packaged'), 30); // 3 * 10
  assert.strictEqual(estimateMeals(10, 'beverages'), 40); // 4 * 10
});

test('impact: estimateCO2Saved calculates environmental emission savings accurately', () => {
  assert.strictEqual(estimateCO2Saved(10), 25); // 2.5 * 10
  assert.strictEqual(estimateCO2Saved(4.2), 10.5); // 2.5 * 4.2
});

test('impact: completed delivery creates impact record linked to donor, recipient, and food', () => {
  resetDemo();
  const initialRecords = getImpactRecords().length;
  const baseTime = getSafeNow();

  const listing = addFoodListing({
    donorId: 'donor-user-1',
    organizationId: 'org-donor-1',
    foodName: 'Hot Veg Pulao',
    category: 'prepared_meals',
    quantity: 20,
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
    quantity: 20,
    matchScore: 92,
    matchExplanation: 'Match',
  });
  assert.ok(!('error' in res));

  // Advance to delivered
  updateRescueStatus(res.id, 'pickup_scheduled');
  updateRescueStatus(res.id, 'collected');
  updateRescueStatus(res.id, 'delivered');

  const afterRecords = getImpactRecords();
  assert.strictEqual(afterRecords.length, initialRecords + 1);

  const createdImpact = afterRecords[0];
  assert.strictEqual(createdImpact.rescueRequestId, res.id);
  assert.strictEqual(createdImpact.listingId, listing.id);
  assert.strictEqual(createdImpact.donorOrgId, 'org-donor-1');
  assert.strictEqual(createdImpact.recipientOrgId, 'org-ngo-1');
  assert.strictEqual(createdImpact.quantityKg, 20);
  assert.strictEqual(createdImpact.estimatedMeals, 50); // 20 * 2.5
  assert.strictEqual(createdImpact.estimatedCO2SavedKg, 50); // 20 * 2.5
});

test('impact: calling delivered again does not create duplicate impact records', () => {
  resetDemo();
  const initialRecords = getImpactRecords().length;
  const baseTime = getSafeNow();

  const listing = addFoodListing({
    donorId: 'donor-user-1',
    organizationId: 'org-donor-1',
    foodName: 'Fruit Baskets',
    category: 'produce',
    quantity: 10,
    unit: 'kg',
    preparedAt: null,
    receivedAt: null,
    expiresAt: new Date(baseTime + 12 * 3600000).toISOString(),
    safePickupDeadline: new Date(baseTime + 10 * 3600000).toISOString(),
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
    matchExplanation: 'Match',
  });
  assert.ok(!('error' in res));

  updateRescueStatus(res.id, 'delivered');
  const countAfterFirst = getImpactRecords().length;
  assert.strictEqual(countAfterFirst, initialRecords + 1);

  // Second delivery call
  updateRescueStatus(res.id, 'delivered');
  const countAfterSecond = getImpactRecords().length;
  assert.strictEqual(countAfterSecond, countAfterFirst);
});

test('impact: getImpactSummary aggregates totals correctly', () => {
  resetDemo();
  const summary = getImpactSummary();
  assert.ok(summary.totalFoodKg > 0);
  assert.ok(summary.totalMeals > 0);
  assert.ok(summary.totalCO2Saved > 0);
  assert.ok(summary.records.length > 0);
});
