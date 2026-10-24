import { NextResponse } from 'next/server';
import type { FoodCategory, StorageRequirement, FoodListing } from '@/lib/types';

const VALID_CATEGORIES: FoodCategory[] = [
  'prepared_meals',
  'bakery',
  'dairy',
  'produce',
  'packaged',
  'beverages',
  'frozen',
];

const VALID_STORAGE: StorageRequirement[] = [
  'ambient',
  'refrigerated',
  'frozen',
  'hot_holding',
];

function isFoodCategory(val: unknown): val is FoodCategory {
  return typeof val === 'string' && (VALID_CATEGORIES as readonly string[]).includes(val);
}

function isStorageRequirement(val: unknown): val is StorageRequirement {
  return typeof val === 'string' && (VALID_STORAGE as readonly string[]).includes(val);
}

export async function POST(req: Request) {
  let rawContent = '';
  try {
    const body = await req.json();
    rawContent = typeof body?.content === 'string' ? body.content.trim() : '';

    if (!rawContent) {
      return NextResponse.json(
        { error: 'No content provided for extraction.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Deterministic CSV / line parser fallback
      const parsed = parseTextDeterministically(rawContent);
      return NextResponse.json({
        ...parsed,
        isAIGenerated: false,
      });
    }

    const prompt = `You are an AI Food Inventory Assistant. Extract surplus food listings from the user's input:
"""
${rawContent.slice(0, 4000)}
"""

Allowed categories: "prepared_meals", "bakery", "dairy", "produce", "packaged", "beverages", "frozen".
Allowed storageRequirements: "ambient", "refrigerated", "frozen", "hot_holding".

Output strictly valid JSON with this schema:
{
  "confidence": number between 0 and 1,
  "warnings": string[],
  "items": [
    {
      "foodName": string,
      "category": string (must match allowed categories),
      "quantity": number,
      "unit": string (default "kg"),
      "storageRequirement": string (must match allowed storage),
      "hoursUntilExpiry": number (estimated hours food is safe to consume),
      "pickupArea": string (default "Indiranagar" if unspecified),
      "allergens": string[]
    }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1200,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error status: ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Empty response from AI service');
    }

    const parsed = JSON.parse(candidateText);
    const rawItems: Record<string, unknown>[] = Array.isArray(parsed?.items) ? parsed.items : [];
    const warnings: string[] = Array.isArray(parsed?.warnings) ? parsed.warnings : [];

    // Deterministic safety validation and date calculation
    const now = Date.now();
    const validatedCandidates: Partial<FoodListing>[] = [];

    for (const item of rawItems) {
      const foodName = typeof item.foodName === 'string' && item.foodName.trim() ? item.foodName.trim() : 'Surplus Food';
      const category: FoodCategory = isFoodCategory(item.category)
        ? item.category
        : 'prepared_meals';
      const storageRequirement: StorageRequirement = isStorageRequirement(item.storageRequirement)
        ? item.storageRequirement
        : 'ambient';
      const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 10;
      const unit = typeof item.unit === 'string' && item.unit.trim() ? item.unit.trim() : 'kg';
      const hoursUntilExpiry = typeof item.hoursUntilExpiry === 'number' && item.hoursUntilExpiry > 0
        ? Math.min(item.hoursUntilExpiry, 168)
        : 6;

      // Safe pickup deadline is strictly before expiry (minimum 1 hour buffer)
      const expiryDate = new Date(now + hoursUntilExpiry * 3600000).toISOString();
      const pickupBufferHours = Math.max(1, Math.min(2, hoursUntilExpiry * 0.25));
      const pickupDeadline = new Date(now + (hoursUntilExpiry - pickupBufferHours) * 3600000).toISOString();

      validatedCandidates.push({
        foodName,
        category,
        quantity,
        availableQuantity: quantity,
        unit,
        storageRequirement,
        expiresAt: expiryDate,
        safePickupDeadline: pickupDeadline,
        pickupArea: typeof item.pickupArea === 'string' && item.pickupArea.trim() ? item.pickupArea.trim() : 'Indiranagar',
        allergens: Array.isArray(item.allergens) ? item.allergens.map(String) : [],
        description: `AI-extracted listing: ${foodName}`,
      });
    }

    return NextResponse.json({
      candidates: validatedCandidates,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
      warnings,
      isAIGenerated: true,
    });
  } catch (error) {
    console.error('Server AI extract error:', error);
    // Fallback to deterministic parser
    return NextResponse.json({
      ...parseTextDeterministically(rawContent),
      isAIGenerated: false,
    });
  }
}

function parseTextDeterministically(text: string): {
  candidates: Partial<FoodListing>[];
  confidence: number;
  warnings: string[];
} {
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const candidates: Partial<FoodListing>[] = [];
  const now = Date.now();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip header line if CSV
    if (i === 0 && line.toLowerCase().includes('food') && line.toLowerCase().includes('quantity')) {
      continue;
    }

    const parts = line.includes(',') ? line.split(',').map((p) => p.trim()) : line.split(' - ').map((p) => p.trim());
    const name = parts[0] || `Item ${i + 1}`;
    const qty = parseFloat(parts[1]) || 10;
    const catInput = (parts[2] || '').toLowerCase().replace(/\s+/g, '_');
    const category: FoodCategory = VALID_CATEGORIES.includes(catInput as FoodCategory)
      ? (catInput as FoodCategory)
      : 'prepared_meals';

    candidates.push({
      foodName: name,
      category,
      quantity: qty,
      availableQuantity: qty,
      unit: 'kg',
      storageRequirement: category === 'dairy' ? 'refrigerated' : category === 'prepared_meals' ? 'hot_holding' : 'ambient',
      expiresAt: new Date(now + 6 * 3600000).toISOString(),
      safePickupDeadline: new Date(now + 4 * 3600000).toISOString(),
      pickupArea: 'Indiranagar',
      allergens: [],
      description: `Imported item: ${name}`,
    });
  }

  return {
    candidates,
    confidence: 0.8,
    warnings: ['Parsed using deterministic rule parser. Please review dates and storage requirements before publishing.'],
  };
}
