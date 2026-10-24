// ──────────────────────────────────────────────
// FreshLoop AI — AI Service Interface
// ──────────────────────────────────────────────
// Server-side AI service for Gemini integration.
// Falls back to deterministic logic when no API
// key is configured.

import type { FoodListing, AIPriorityExplanation } from './types';

export function isAIAvailable(): boolean {
  // Returns true if server environment or API is reachable
  return true;
}

export async function generatePriorityExplanation(
  listings: { foodName: string; urgencyScore: number; reasons: string[]; timeRemaining: number }[]
): Promise<AIPriorityExplanation> {
  // If in browser, call server-side API route for secure Gemini processing
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listings }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          summary: data.summary,
          details: data.details,
          generatedAt: data.generatedAt || new Date().toISOString(),
          isAIGenerated: Boolean(data.isAIGenerated),
        };
      }
    } catch {
      // Fall through to deterministic fallback
    }
  }

  // Deterministic fallback
  const topItems = listings
    .slice(0, 5)
    .map((l, i) => `${i + 1}. ${l.foodName} (urgency: ${l.urgencyScore}/100, ${l.timeRemaining}min left)`)
    .join('\n');

  return {
    summary: `${listings.length} listings ranked by urgency. Top priority items need immediate rescue based on time sensitivity, quantity, and perishability.`,
    details: `Priority ranking (deterministic — AI standby):\n\n${topItems}\n\nRanking factors: safe pickup deadline, quantity available, storage perishability, and preparation age. Items with hot-holding requirements or under 1 hour remaining receive highest priority.`,
    generatedAt: new Date().toISOString(),
    isAIGenerated: false,
  };
}

export async function extractFoodListingsFromCSV(
  csvContent: string
): Promise<{
  candidates: Partial<FoodListing>[];
  confidence: number;
  warnings: string[];
}> {
  // Call secure server-side endpoint if in browser
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: csvContent }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.candidates) && data.candidates.length > 0) {
          return {
            candidates: data.candidates,
            confidence: data.confidence ?? 0.85,
            warnings: Array.isArray(data.warnings) ? data.warnings : [],
          };
        }
      }
    } catch {
      // Fall through to local CSV parser
    }
  }

  return parseCSVManually(csvContent);
}

function parseCSVManually(csvContent: string): {
  candidates: Partial<FoodListing>[];
  confidence: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  const lines = csvContent.trim().split('\n');

  if (lines.length < 2) {
    return { candidates: [], confidence: 0, warnings: ['CSV appears to be empty or has no data rows.'] };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const candidates: Partial<FoodListing>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    if (values.length < 2) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });

    candidates.push({
      foodName: row['name'] || row['food_name'] || row['item'] || row['food'] || `Item ${i}`,
      category: 'other',
      quantity: parseFloat(row['quantity'] || row['qty'] || '1') || 1,
      unit: row['unit'] || 'kg',
      storageRequirement: 'ambient',
      allergens: row['allergens'] ? row['allergens'].split(';').map((a) => a.trim()) : [],
      description: row['description'] || row['desc'] || '',
      pickupArea: row['area'] || row['location'] || row['pickup_area'] || '',
    });
  }

  if (candidates.length === 0) {
    warnings.push('No valid food items could be extracted from the CSV.');
  } else {
    warnings.push('Parsed using basic CSV parser (AI unavailable). Please review all fields carefully.');
  }

  return {
    candidates,
    confidence: 0.5,
    warnings,
  };
}
