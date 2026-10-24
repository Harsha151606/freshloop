import { NextResponse } from 'next/server';

interface ListingItem {
  foodName: string;
  urgencyScore: number;
  reasons: string[];
  timeRemaining: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const listings: ListingItem[] = Array.isArray(body?.listings) ? body.listings : [];

    if (listings.length === 0) {
      return NextResponse.json({
        summary: 'No active listings to prioritize.',
        details: 'The Rescue Decision Room will generate priority recommendations as soon as listings are posted.',
        isAIGenerated: false,
        generatedAt: new Date().toISOString(),
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Server-side deterministic fallback when GEMINI_API_KEY is not configured
    if (!apiKey) {
      const topItems = listings
        .slice(0, 5)
        .map((l, i) => `${i + 1}. ${l.foodName} (urgency: ${l.urgencyScore}/100, ${l.timeRemaining}min left)`)
        .join('\n');

      return NextResponse.json({
        summary: `${listings.length} listings ranked deterministically by urgency. Most urgent items require fast coordination based on perishability and expiry.`,
        details: `Priority analysis (deterministic rules):\n\n${topItems}\n\nFactors evaluated: safe pickup deadline, available quantity, required storage facilities, and preparation window.`,
        isAIGenerated: false,
        generatedAt: new Date().toISOString(),
      });
    }

    // Call Gemini 2.0 Flash with strict structured JSON schema
    const prompt = `You are FreshLoop AI's Food Rescue Coordinator. Analyze these surplus food opportunities and produce a concise briefing:
${listings.slice(0, 8).map((l, i) => `${i + 1}. ${l.foodName}: urgency ${l.urgencyScore}/100, ${l.timeRemaining} mins remaining. Factors: ${l.reasons.join(', ')}`).join('\n')}

Rules:
1. Provide a "summary" (2 sentences max) emphasizing the highest urgency rescues.
2. Provide "details" with tactical guidance on pickup timing and storage constraints.
Return strictly valid JSON with keys "summary" and "details".`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 600,
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
    const summary = typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : null;
    const details = typeof parsed.details === 'string' && parsed.details.trim() ? parsed.details.trim() : null;

    if (!summary || !details) {
      throw new Error('Structured AI output missing required summary/details fields');
    }

    return NextResponse.json({
      summary,
      details,
      isAIGenerated: true,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Server AI explain error:', error);
    // Graceful fallback preserves app continuity
    return NextResponse.json({
      summary: 'Priority queue computed with deterministic safety rules (AI service standby).',
      details: 'All listings are ranked using deterministic urgency scoring (time remaining, storage constraints, quantity).',
      isAIGenerated: false,
      generatedAt: new Date().toISOString(),
    });
  }
}
