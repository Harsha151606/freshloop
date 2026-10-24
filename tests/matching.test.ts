import test from 'node:test';
import assert from 'node:assert';
import { matchRecipients } from '../src/lib/matching-engine';
import type { FoodListing, Organization } from '../src/lib/types';

const mockListing: FoodListing = {
  id: 'test-listing-1',
  donorId: 'donor-1',
  organizationId: 'org-donor',
  foodName: 'Surplus Cooked Biryani',
  category: 'prepared_meals',
  quantity: 25,
  availableQuantity: 25,
  unit: 'kg',
  preparedAt: '2026-10-24T10:00:00.000Z',
  receivedAt: null,
  expiresAt: '2026-10-24T18:00:00.000Z',
  safePickupDeadline: '2026-10-24T16:00:00.000Z',
  pickupArea: 'Indiranagar',
  storageRequirement: 'hot_holding',
  allergens: ['dairy'],
  description: 'Fresh lunch trays',
  status: 'posted',
  createdAt: '2026-10-24T10:00:00.000Z',
  updatedAt: '2026-10-24T10:00:00.000Z',
};

const mockRecipients: Organization[] = [
  {
    id: 'org-kitchen-1',
    name: 'Robin Hood Kitchen',
    type: 'community_kitchen',
    address: '12 1st Cross',
    area: 'Indiranagar',
    city: 'Bangalore',
    contactPhone: '+91 99999 11111',
    categories: ['prepared_meals'],
    storageCapabilities: ['hot_holding', 'ambient'],
    maxCapacityKg: 100,
    operatingHours: '8:00 AM – 10:00 PM',
    isVerified: true,
  },
  {
    id: 'org-ngo-unverified',
    name: 'Unverified Shelter',
    type: 'ngo',
    address: '44 Side Street',
    area: 'Indiranagar',
    city: 'Bangalore',
    contactPhone: '+91 99999 22222',
    categories: ['prepared_meals'],
    storageCapabilities: ['hot_holding'],
    maxCapacityKg: 80,
    operatingHours: '9:00 AM – 8:00 PM',
    isVerified: false,
  },
  {
    id: 'org-cold-lacking',
    name: 'Dry Goods Pantry',
    type: 'food_bank',
    address: '88 High Road',
    area: 'Indiranagar',
    city: 'Bangalore',
    contactPhone: '+91 99999 33333',
    categories: ['packaged', 'produce'],
    storageCapabilities: ['ambient'],
    maxCapacityKg: 200,
    operatingHours: '9:00 AM – 5:00 PM',
    isVerified: true,
  },
];

test('matching: verified organization with matching category and hot holding scores highest and is eligible', () => {
  const matches = matchRecipients(mockListing, mockRecipients);
  assert.ok(matches.length > 0);
  const bestMatch = matches[0];
  assert.strictEqual(bestMatch.recipientOrgId, 'org-kitchen-1');
  assert.strictEqual(bestMatch.isEligible, true);
  assert.ok(bestMatch.score >= 70, `Expected score >= 70, got ${bestMatch.score}`);
  assert.ok(bestMatch.explanation.includes('Indiranagar') || bestMatch.explanation.includes('Robin Hood Kitchen'));
});

test('matching: unverified organization is marked ineligible with clear reason', () => {
  const matches = matchRecipients(mockListing, mockRecipients);
  const unverified = matches.find((m) => m.recipientOrgId === 'org-ngo-unverified');
  assert.ok(unverified);
  assert.strictEqual(unverified.isEligible, false);
  assert.ok(unverified.ineligibilityReason?.includes('pending verification'));
});

test('matching: organization lacking required hot holding storage for hot prepared food is marked ineligible', () => {
  const matches = matchRecipients(mockListing, mockRecipients);
  const lackingStorage = matches.find((m) => m.recipientOrgId === 'org-cold-lacking');
  assert.ok(lackingStorage);
  assert.strictEqual(lackingStorage.isEligible, false);
  assert.ok(lackingStorage.ineligibilityReason?.includes('storage equipment'));
});

test('matching: capacity overflow check marks recipient ineligible if batch exceeds capacity', () => {
  const giantListing: FoodListing = {
    ...mockListing,
    availableQuantity: 500,
  };
  const matches = matchRecipients(giantListing, [mockRecipients[0]]);
  assert.strictEqual(matches[0].isEligible, false);
  assert.ok(matches[0].ineligibilityReason?.includes('exceeds recipient max capacity'));
});
