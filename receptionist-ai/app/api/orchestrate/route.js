/**
 * POST /api/orchestrate
 *
 * Multi-model AI pipeline:
 *   1. DeepAI  → Reasoning  (intent analysis, entity extraction, sentiment)
 *   2. DeepSeek → Implementation (response generation, routing decision, action plan)
 *   3. Validation → automated tests on the generated response
 *   4. Integration → CRM / ticket metadata assembly
 *
 * Body: { transcript: string, callId: string, callerName?: string }
 */

import { NextResponse } from "next/server";

// ── helpers ──────────────────────────────────────────────────────────────────

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function sanitize(str) {
  // Trim and limit input length to prevent prompt injection / oversized payloads
  if (typeof str !== "string") return "";
  return str.trim().slice(0, 4000);
}

/** Stage 1 — DeepAI reasoning: intent, entities, sentiment, priority */
async function runReasoning(transcript) {
  const apiKey = requireEnv("DEEPAI_API_KEY");
  const start = Date.now();

  const prompt = [
    "You are an expert call-center analyst.",
    "Analyse the following customer transcript and respond with ONLY a valid JSON object.",
    "JSON schema: { intent, entities, sentiment, priority, summary, suggestedDept }",
    "priority must be: low | medium | high | urgent",
    "sentiment must be: positive | neutral | negative",
    `Transcript: """${transcript}"""`,
  ].join("\n");

  const res = await fetch("https://api.deepai.org/api/text-generator", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ text: prompt }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepAI error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data?.output ?? "";

  // Extract JSON from response (DeepAI may wrap it in prose)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: raw };

  return { ...parsed, latencyMs: Date.now() - start };
}

/** Stage 2 — DeepSeek implementation: response text, action plan, routing */
async function runImplementation(transcript, reasoning) {
  const apiKey = requireEnv("DEEPSEEK_API_KEY");
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
  const start = Date.now();

  const systemPrompt = [
    "You are an AI receptionist assistant that handles phone calls.",
    "You receive a customer transcript plus an intent analysis.",
    "Respond ONLY with a valid JSON object matching the schema:",
    '{ "response": string, "actions": string[], "routeTo": string, "confidence": number }',
    '"response" is what the AI receptionist should say back to the caller (≤ 3 sentences).',
    '"actions" is a list of follow-up tasks.',
    '"routeTo" is the department name (e.g., "Sales", "Support", "Billing", "Onboarding").',
    '"confidence" is 0-100.',
  ].join("\n");

  const userMessage = [
    `Transcript: "${transcript}"`,
    `Reasoning: ${JSON.stringify(reasoning)}`,
  ].join("\n");

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepSeek error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? "";

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { response: raw };

  return { ...parsed, latencyMs: Date.now() - start };
}

/** Stage 3 — Testing: validate the implementation output */
function runTests(implementation) {
  const tests = [
    {
      name: "Response not empty",
      pass: typeof implementation.response === "string" && implementation.response.length > 0,
    },
    {
      name: "Confidence above threshold (≥ 40)",
      pass: typeof implementation.confidence === "number" && implementation.confidence >= 40,
    },
    {
      name: "Valid routing department",
      pass:
        typeof implementation.routeTo === "string" &&
        ["Sales", "Support", "Billing", "Onboarding", "General", "Management"].includes(
          implementation.routeTo
        ),
    },
    {
      name: "Actions list present",
      pass: Array.isArray(implementation.actions) && implementation.actions.length > 0,
    },
    {
      name: "No sensitive data in response",
      pass: !/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(implementation.response ?? ""),
    },
  ];

  const passed = tests.filter((t) => t.pass).length;
  return { tests, passed, total: tests.length, score: Math.round((passed / tests.length) * 100) };
}

/** Stage 4 — Integration metadata assembly */
function buildIntegration(callId, reasoning, implementation) {
  return {
    ticketId: `TKT-${Date.now().toString(36).toUpperCase()}`,
    callId,
    department: implementation.routeTo ?? "General",
    priority: reasoning.priority ?? "medium",
    crmEntry: {
      intent:    reasoning.intent ?? "Unknown",
      sentiment: reasoning.sentiment ?? "neutral",
      summary:   reasoning.summary ?? "",
    },
    actions: implementation.actions ?? [],
    timestamp: new Date().toISOString(),
  };
}

// ── route handler ─────────────────────────────────────────────────────────────

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const transcript = sanitize(body?.transcript ?? "");
  const callId     = sanitize(body?.callId ?? `call-${Date.now()}`);

  if (!transcript) {
    return NextResponse.json({ error: "transcript is required" }, { status: 400 });
  }

  const pipeline = {
    callId,
    stages: {},
    success: false,
  };

  try {
    // — Stage 1: DeepAI Reasoning —
    const reasoning = await runReasoning(transcript);
    pipeline.stages.reasoning = { status: "passed", ...reasoning };

    // — Stage 2: DeepSeek Implementation —
    const implementation = await runImplementation(transcript, reasoning);
    pipeline.stages.implementation = { status: "passed", ...implementation };

    // — Stage 3: Testing —
    const testResult = runTests(implementation);
    pipeline.stages.testing = {
      status: testResult.passed === testResult.total ? "passed" : "partial",
      ...testResult,
    };

    // — Stage 4: Integration —
    const integration = buildIntegration(callId, reasoning, implementation);
    pipeline.stages.integration = { status: "passed", ...integration };

    pipeline.success = true;
    return NextResponse.json(pipeline);
  } catch (err) {
    // Surface which stage failed without leaking internal stack traces
    pipeline.error = err.message.slice(0, 300);
    return NextResponse.json(pipeline, { status: 500 });
  }
}
