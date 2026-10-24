// ──────────────────────────────────────────────
// FreshLoop AI — Urgency Engine
// ──────────────────────────────────────────────
// Deterministic ranking of rescue opportunities
// based on time remaining, quantity, and safety.

import type { FoodListing, UrgencyScore, UrgencyLevel } from './types';
import { minutesFromNow, getSafeNow } from './utils';

export function calculateUrgency(listing: FoodListing): UrgencyScore {
  const timeToExpiry = minutesFromNow(listing.expiresAt);
  const timeToPickupDeadline = minutesFromNow(listing.safePickupDeadline);
  const effectiveMinutes = Math.min(timeToExpiry, timeToPickupDeadline);
  const reasons: string[] = [];

  // ── Safety gate: expired or past safe pickup ──
  if (timeToExpiry <= 0) {
    return {
      listingId: listing.id,
      score: 0,
      level: 'low',
      reasons: ['Food has expired — no longer eligible for rescue.'],
      timeRemainingMinutes: 0,
      isEligible: false,
      ineligibilityReason: 'This listing has expired and is no longer safe for consumption.',
    };
  }

  if (timeToPickupDeadline <= 0) {
    return {
      listingId: listing.id,
      score: 0,
      level: 'low',
      reasons: ['Safe pickup deadline has passed — no longer eligible.'],
      timeRemainingMinutes: 0,
      isEligible: false,
      ineligibilityReason: 'The safe pickup deadline has passed. Food safety cannot be guaranteed.',
    };
  }

  if (listing.status === 'expired' || listing.status === 'cancelled' || listing.status === 'fully_claimed') {
    return {
      listingId: listing.id,
      score: 0,
      level: 'low',
      reasons: [`Listing is ${listing.status} — not available.`],
      timeRemainingMinutes: effectiveMinutes,
      isEligible: false,
      ineligibilityReason: `This listing has been ${listing.status}.`,
    };
  }

  // ── Time factor (0–50 points) ──
  let timeScore: number;
  if (effectiveMinutes <= 60) {
    timeScore = 50;
    reasons.push(`⚡ Less than 1 hour remaining — immediate rescue needed.`);
  } else if (effectiveMinutes <= 180) {
    timeScore = 40;
    reasons.push(`🔴 Less than 3 hours remaining — high urgency.`);
  } else if (effectiveMinutes <= 360) {
    timeScore = 30;
    reasons.push(`🟡 Less than 6 hours remaining — moderate urgency.`);
  } else if (effectiveMinutes <= 720) {
    timeScore = 20;
    reasons.push(`Under 12 hours remaining.`);
  } else if (effectiveMinutes <= 1440) {
    timeScore = 10;
    reasons.push(`Under 24 hours remaining.`);
  } else {
    timeScore = 5;
    reasons.push(`More than 24 hours remaining.`);
  }

  // ── Quantity factor (0–25 points) ──
  let quantityScore: number;
  const qty = listing.availableQuantity;
  if (qty >= 50) {
    quantityScore = 25;
    reasons.push(`Large quantity (${qty} ${listing.unit}) — high rescue value.`);
  } else if (qty >= 20) {
    quantityScore = 20;
    reasons.push(`Significant quantity (${qty} ${listing.unit}) available.`);
  } else if (qty >= 10) {
    quantityScore = 15;
    reasons.push(`Moderate quantity (${qty} ${listing.unit}) available.`);
  } else {
    quantityScore = 10;
    reasons.push(`${qty} ${listing.unit} available.`);
  }

  // ── Perishability factor (0–15 points) ──
  let perishabilityScore: number;
  if (listing.storageRequirement === 'hot_holding') {
    perishabilityScore = 15;
    reasons.push(`Hot-holding required — highly perishable, must be rescued quickly.`);
  } else if (listing.storageRequirement === 'refrigerated') {
    perishabilityScore = 10;
    reasons.push(`Requires refrigeration — perishable item.`);
  } else if (listing.storageRequirement === 'frozen') {
    perishabilityScore = 5;
    reasons.push(`Frozen storage — lower perishability risk.`);
  } else {
    perishabilityScore = 3;
    reasons.push(`Ambient storage — shelf-stable.`);
  }

  // ── Prepared food bonus (0–10 points) ──
  let preparedBonus = 0;
  if (listing.category === 'prepared_meals' && listing.preparedAt) {
    const hoursSincePrepared = (getSafeNow() - new Date(listing.preparedAt).getTime()) / 3600000;
    if (hoursSincePrepared > 2) {
      preparedBonus = 10;
      reasons.push(`Prepared ${Math.round(hoursSincePrepared)} hours ago — rescue window narrowing.`);
    }
  }

  const totalScore = timeScore + quantityScore + perishabilityScore + preparedBonus;
  const level = getUrgencyLevel(totalScore);

  return {
    listingId: listing.id,
    score: Math.min(totalScore, 100),
    level,
    reasons,
    timeRemainingMinutes: effectiveMinutes,
    isEligible: true,
  };
}

function getUrgencyLevel(score: number): UrgencyLevel {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

export function rankListingsByUrgency(
  listings: FoodListing[]
): { listing: FoodListing; urgency: UrgencyScore }[] {
  return listings
    .map((listing) => ({
      listing,
      urgency: calculateUrgency(listing),
    }))
    .sort((a, b) => {
      // Eligible first
      if (a.urgency.isEligible && !b.urgency.isEligible) return -1;
      if (!a.urgency.isEligible && b.urgency.isEligible) return 1;
      // Then by score descending
      return b.urgency.score - a.urgency.score;
    });
}
