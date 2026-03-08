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

const SIMULATOR_STREAM_SYSTEM = `You are the Finco Simulator. Explain the result of a financial simulation in plain language.

You must cover exactly these four points, each in 1-2 sentences with specific dollar amounts from the simulation:
1. What changed — the node and amount difference (use exact numbers from the data).
2. Biggest risk — the main downside or vulnerability (cite a specific amount or metric).
3. Biggest opportunity — the main upside or improvement (cite a specific amount or metric).
4. One recommendation — a single concrete next step based on the numbers.

Every sentence must include specific dollar amounts or percentages from the actual before/after state. No generic advice. No markdown. Plain text only.`;

export async function* streamSimulatorResponse(
  beforeAfterState: string
): AsyncGenerator<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
  const { stream } = await model.generateContentStream([
    { text: SIMULATOR_STREAM_SYSTEM },
    { text: beforeAfterState },
  ]);
  for await (const chunk of stream) {
    const text = chunk.text();
    if (text) yield text;
  }
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

const SENTINEL_JSON_SYSTEM =
  "You are a financial data assistant. You respond only with valid JSON. You never include markdown, explanation, preamble, or any text outside the JSON object. Your determinations are based on common Canadian personal finance patterns.";

const SENTINEL_JSON_TIMEOUT_MS = 3000;

export interface SimulatorImpactChange {
  nodeId: string;
  currentValue?: number;
  monthlyFlow?: number;
}

export interface SimulatorImpactResult {
  changes: SimulatorImpactChange[];
  primaryChangeNodeId?: string;
}

const SIMULATOR_IMPACT_JSON_SYSTEM = `You are a financial simulation engine. You respond ONLY with valid JSON. No markdown, no explanation.

Given a graph state and a user's "what if" message, determine which nodes are affected and their NEW values after the scenario.

Rules:
- Use the exact node "id" values from the graph (e.g. "node-123").
- For each affected node, return the NEW absolute value: currentValue for balance-type nodes (savings, account, debt), monthlyFlow for flow-type (income, expense). So if "chequing loses $500" and chequing had currentValue 2500, return currentValue: 2000 (the new balance), NOT 500.
- If the user changes one node (e.g. "reduce salary by $500"), compute which other nodes change as a result (e.g. chequing balance drops) and include them with their new values.
- Return a JSON object with: "changes" (array of { "nodeId": string, "currentValue"?: number, "monthlyFlow"?: number }) and optionally "primaryChangeNodeId" (the node the user directly asked to change).
- Only include nodes that actually change. Numbers must be the new absolute values, not deltas.`;

export async function generateSimulatorImpactJson(
  graphState: string,
  userMessage: string
): Promise<SimulatorImpactResult | null> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const result = await Promise.race([
      model.generateContent([
        { text: SIMULATOR_IMPACT_JSON_SYSTEM },
        { text: `GRAPH STATE:\n${graphState}\n\nUSER WHAT-IF MESSAGE:\n${userMessage}` },
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 8000)
      ),
    ]);
    const text = result.response.text();
    const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const changes = Array.isArray(parsed.changes) ? parsed.changes : [];
    const primary = typeof parsed.primaryChangeNodeId === "string" ? parsed.primaryChangeNodeId : undefined;
    const normalized: SimulatorImpactChange[] = changes.map((c: Record<string, unknown>) => ({
      nodeId: String(c.nodeId ?? ""),
      currentValue: typeof c.currentValue === "number" ? c.currentValue : undefined,
      monthlyFlow: typeof c.monthlyFlow === "number" ? c.monthlyFlow : undefined,
    })).filter((c) => c.nodeId.length > 0);
    return { changes: normalized, primaryChangeNodeId: primary ?? undefined };
  } catch {
    return null;
  }
}

export async function generateSentinelJson(userMessage: string): Promise<Record<string, unknown> | null> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const result = await Promise.race([
      model.generateContent([
        { text: SENTINEL_JSON_SYSTEM },
        { text: userMessage },
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), SENTINEL_JSON_TIMEOUT_MS)
      ),
    ]);
    const text = result.response.text();
    const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return null;
  }
}
