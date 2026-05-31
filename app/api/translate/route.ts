import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const runtime = "nodejs";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You decode corporate-speak and polite-speak. The user gives you something a coworker, customer, or stakeholder said. You reveal what they ACTUALLY mean underneath the politeness.

Be specific, witty, and a little sharp — but never cruel. Read tone, context, and what's left unsaid. Your job is the unspoken truth.

Return STRICT JSON only, no prose, no markdown fences. Schema:
{
  "literal": "<one-line clean restatement of what they said>",
  "actually_means": "<the real meaning, 1-2 sentences>",
  "vibe": "<one of: passive-aggressive, polite-no, hidden-frustration, gentle-pushback, fake-enthusiasm, real-praise, urgency-disguised, buying-time, cya, sincere>",
  "confidence": <integer 0-100>,
  "tell": "<the specific phrase or word that tipped you off>",
  "suggested_response": "<one sentence — what to say back>"
}`;

export async function POST(req: Request) {
  try {
    const { transcript } = await req.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ error: "transcript required" }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
