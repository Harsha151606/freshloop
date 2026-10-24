import test from 'node:test';
import assert from 'node:assert';
import { generatePriorityExplanation, extractFoodListingsFromCSV } from '../src/lib/ai-service';

test('ai: generatePriorityExplanation generates structured briefing with deterministic fallback', async () => {
  const listings = [
    {
      foodName: 'Hot Vegetable Biryani',
      urgencyScore: 85,
      reasons: ['Less than 2 hours remaining', 'Hot-holding required'],
      timeRemaining: 110,
    },
    {
      foodName: 'Whole Wheat Loaves',
      urgencyScore: 40,
      reasons: ['Under 12 hours remaining'],
      timeRemaining: 600,
    },
  ];

  const result = await generatePriorityExplanation(listings);
  assert.ok(result.summary.length > 0);
  assert.ok(result.details.length > 0);
  assert.strictEqual(typeof result.isAIGenerated, 'boolean');
  assert.ok(result.details.includes('Hot Vegetable Biryani'));
});

test('ai: extractFoodListingsFromCSV extracts valid listings with safe defaults', async () => {
  const sampleCSV = `Food Name, Quantity, Category
Fresh Milk, 20, dairy
Fruit Trays, 15, produce`;

  const result = await extractFoodListingsFromCSV(sampleCSV);
  assert.ok(result.candidates.length >= 2);
  const first = result.candidates[0];
  assert.ok(first.foodName);
  assert.ok(first.quantity && first.quantity > 0);
  assert.ok(result.confidence > 0);
});
