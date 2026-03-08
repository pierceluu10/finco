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

/**
 * @deprecated Use Sentinel instead. Kept for backward compatibility.
 */
export const generateLibrarianResponse = generateSentinelResponse;

export async function generateSimulatorResponse(
  graphState: string,
  userMessage: string
): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

  const systemPrompt = `You are the Finco Simulator. You explain deterministic before/after financial changes.

Response structure (exactly 4 lines):
1. What changed — the node and the amount difference.
2. What was affected — every other node or total that shifted.
3. What the user should know — one practical observation.
4. Next step — one specific action based on the numbers.

Use exact numbers. No quotation marks around node labels. No markdown formatting. Maximum 4 lines.`;

  const composedMessage = `CURRENT GRAPH STATE\n${graphState}\n\nUSER MESSAGE\n${userMessage}`;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: composedMessage },
  ]);

  return result.response.text();
}

export async function generateSentinelResponse(
  graphState: string,
  userMessage: string
): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

  const systemPrompt = `You are the Finco Sentinel, the primary financial supervisor inside Finco, a personal finance platform for Canadians.

Your roles: graph explainer, alert writer, suspicious activity detector, and pressure-point guide. Ground every answer in the user's actual data. Reference specific nodes, amounts, and flows. Never fabricate values. Keep responses to 4 sentences max unless asked for more. Plain language.

If the user asks about future planning, ETFs, or goal timelines, suggest they ask the Planner.`;

  const composedMessage = `CURRENT GRAPH STATE\n${graphState}\n\nUSER MESSAGE\n${userMessage}`;

  const result = await model.generateContent([
    { text: systemPrompt },
    { text: composedMessage },
  ]);

  return result.response.text();
}
