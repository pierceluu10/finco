import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not configured");
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

export async function generateStrategistResponse(
  message: string,
  context: string
): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  const systemPrompt = `You are Finco's Financial Strategist AI. You help Canadian users understand their finances and make better decisions.

CONTEXT (user's current financial state):
${context}

RULES:
- Be concise and direct (2-4 paragraphs max)
- Reference specific numbers from the user's data
- Mention risk level when relevant (low/medium/high/critical)
- Give one clear recommended action
- Use Canadian financial context (TFSA, RRSP, CAD)
- Don't be preachy or generic — be specific and grounded
- Format key numbers with $ signs`;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: message },
  ]);

  return result.response.text();
}

export async function generateLibrarianExplanation(
  nodeData: Record<string, unknown>
): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  const systemPrompt = `You are Finco's Librarian AI. You explain financial graph nodes and their significance.

Given this financial node data, provide a brief 2-3 sentence explanation of:
1. What this node represents in the user's financial ecosystem
2. Why it matters
3. One thing the user should notice or consider

Be concise, specific, and reference the actual values. Use Canadian financial context.`;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: JSON.stringify(nodeData) },
  ]);

  return result.response.text();
}

export async function generateForecastExplanation(
  forecastData: Record<string, unknown>
): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  const systemPrompt = `You are Finco's Forecaster AI. Summarize the 30/60/90 day financial outlook.

Given this forecast data, explain:
1. Which periods look stable vs risky
2. What's driving the pressure
3. One actionable suggestion

Be concise (2-3 sentences). Use Canadian financial context.`;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: JSON.stringify(forecastData) },
  ]);

  return result.response.text();
}
