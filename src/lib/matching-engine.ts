// ──────────────────────────────────────────────
// FreshLoop AI — Matching Engine
// ──────────────────────────────────────────────
// Deterministic recipient matching based on
// category compatibility, capacity, storage,
// distance heuristic, and pickup feasibility.

import type { FoodListing, Organization, MatchResult } from './types';
import { categoryLabel, getSafeDate } from './utils';

// Simple area-based distance heuristic (km)
const AREA_DISTANCES: Record<string, Record<string, number>> = {
  'Indiranagar': { 'Koramangala': 4.2, 'Jayanagar': 7.5, 'Whitefield': 14, 'MG Road': 3, 'HSR Layout': 6 },
  'MG Road': { 'Koramangala': 5, 'Jayanagar': 6, 'Whitefield': 16, 'Indiranagar': 3, 'HSR Layout': 7 },
  'HSR Layout': { 'Koramangala': 3, 'Jayanagar': 5, 'Whitefield': 12, 'Indiranagar': 6, 'MG Road': 7 },
  'Koramangala': { 'Indiranagar': 4.2, 'Jayanagar': 4, 'Whitefield': 15, 'MG Road': 5, 'HSR Layout': 3 },
  'Jayanagar': { 'Indiranagar': 7.5, 'Koramangala': 4, 'Whitefield': 18, 'MG Road': 6, 'HSR Layout': 5 },
  'Whitefield': { 'Indiranagar': 14, 'Koramangala': 15, 'Jayanagar': 18, 'MG Road': 16, 'HSR Layout': 12 },
};

function getDistance(area1: string, area2: string): number {
  if (area1 === area2) return 0;
  return AREA_DISTANCES[area1]?.[area2] ?? AREA_DISTANCES[area2]?.[area1] ?? 10;
}

export function matchRecipients(
  listing: FoodListing,
  recipientOrgs: Organization[]
): MatchResult[] {
  return recipientOrgs
    .map((org) => scoreRecipient(listing, org))
    .sort((a, b) => {
      // Eligible first
      if (a.isEligible && !b.isEligible) return -1;
      if (!a.isEligible && b.isEligible) return 1;
      return b.score - a.score;
    });
}

function scoreRecipient(listing: FoodListing, org: Organization): MatchResult {
  // ── Eligibility Checks ──
  const ineligibilityReasons: string[] = [];
  if (!org.isVerified) {
    ineligibilityReasons.push('Organization is pending verification.');
  }

  // Storage hard constraint for perishable foods
  const hasStorage = org.storageCapabilities.includes(listing.storageRequirement);
  if (!hasStorage && listing.storageRequirement !== 'ambient') {
    ineligibilityReasons.push(
      `Lacks required ${listing.storageRequirement.replace('_', ' ')} storage equipment for safe handling.`
    );
  }

  // Extreme capacity overflow check
  if (listing.availableQuantity > org.maxCapacityKg) {
    ineligibilityReasons.push(
      `Batch quantity (${listing.availableQuantity} ${listing.unit}) exceeds recipient max capacity (${org.maxCapacityKg} kg).`
    );
  }

  const isEligible = ineligibilityReasons.length === 0;

  // 1. Category match (0–30)
  const categoryMatch = org.categories.includes(listing.category) ? 30 : 10;

  // 2. Capacity match (0–20)
  let capacityMatch: number;
  if (listing.availableQuantity <= org.maxCapacityKg * 0.3) {
    capacityMatch = 20;
  } else if (listing.availableQuantity <= org.maxCapacityKg * 0.7) {
    capacityMatch = 15;
  } else if (listing.availableQuantity <= org.maxCapacityKg) {
    capacityMatch = 10;
  } else {
    capacityMatch = 0;
  }

  // 3. Storage match (0–20)
  const storageMatch = hasStorage ? 20 : 0;

  // 4. Distance score (0–20)
  const distance = getDistance(listing.pickupArea, org.area);
  let distanceScore: number;
  if (distance <= 3) {
    distanceScore = 20;
  } else if (distance <= 7) {
    distanceScore = 15;
  } else if (distance <= 15) {
    distanceScore = 10;
  } else {
    distanceScore = 5;
  }

  // 5. Pickup feasibility (0–10)
  const now = getSafeDate();
  const hours = now.getHours();
  const opHours = org.operatingHours;
  let pickupFeasibility = 10;
  const openMatch = opHours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  const closeMatch = opHours.match(/–\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (openMatch && closeMatch) {
    let openHour = parseInt(openMatch[1]);
    if (openMatch[3].toUpperCase() === 'PM' && openHour !== 12) openHour += 12;
    if (openMatch[3].toUpperCase() === 'AM' && openHour === 12) openHour = 0;
    let closeHour = parseInt(closeMatch[1]);
    if (closeMatch[3].toUpperCase() === 'PM' && closeHour !== 12) closeHour += 12;
    if (closeMatch[3].toUpperCase() === 'AM' && closeHour === 12) closeHour = 0;
    if (hours < openHour || hours >= closeHour) {
      pickupFeasibility = 4;
    }
  }

  const rawScore = categoryMatch + capacityMatch + storageMatch + distanceScore + pickupFeasibility;
  const totalScore = isEligible ? Math.min(rawScore, 100) : Math.min(rawScore * 0.3, 30);

  // Build human-readable explanation
  const explanationParts: string[] = [];
  if (!isEligible) {
    explanationParts.push(`Not recommended: ${ineligibilityReasons.join(' ')}`);
  } else {
    if (categoryMatch >= 25) {
      explanationParts.push(`${org.name} regularly redistributes ${categoryLabel(listing.category)}`);
    } else {
      explanationParts.push(`${categoryLabel(listing.category)} is outside primary focus`);
    }

    explanationParts.push(`Distance: ~${distance} km from ${listing.pickupArea}`);

    if (hasStorage) {
      explanationParts.push(`Has verified ${listing.storageRequirement} facilities`);
    }

    explanationParts.push(`Capacity: up to ${org.maxCapacityKg} kg`);
  }

  const explanation = explanationParts.join('. ') + '.';

  let suggestedAction: string;
  if (!isEligible) {
    suggestedAction = `Ineligible — ${ineligibilityReasons[0]}`;
  } else if (totalScore >= 80) {
    suggestedAction = `Highly recommended — contact ${org.name} immediately for rescue coordination.`;
  } else if (totalScore >= 60) {
    suggestedAction = `Good match — ${org.name} can safely receive and redistribute this food.`;
  } else if (totalScore >= 40) {
    suggestedAction = `Possible match — verify logistics and storage schedule with ${org.name}.`;
  } else {
    suggestedAction = `Lower compatibility — consider other recipients first.`;
  }

  return {
    recipientOrgId: org.id,
    recipientOrgName: org.name,
    score: Math.round(totalScore),
    explanation,
    isEligible,
    ineligibilityReason: ineligibilityReasons.length > 0 ? ineligibilityReasons.join(' ') : undefined,
    factors: {
      categoryMatch,
      capacityMatch,
      distanceScore,
      storageMatch,
      pickupFeasibility,
    },
    suggestedAction,
  };
}
