/**
 * Backboard assistant definitions and get-or-create logic.
 *
 * Three agents: Sentinel (primary), Simulator, Planner.
 * The Librarian has been merged into the Sentinel.
 */

import {
  listAssistants,
  createAssistant,
  type BackboardAssistant,
  type BackboardToolDef,
} from "./client";
import { SENTINEL_TOOLS, PLANNER_TOOLS } from "./tools";

// ---------------------------------------------------------------------------
// System prompts — compact, role-focused
// ---------------------------------------------------------------------------

const SENTINEL_SYSTEM_PROMPT = `You are the Finco Sentinel, the primary financial supervisor inside Finco, a personal finance platform for Canadians.

You receive the user's financial graph state, calculated metrics, and any triggered rules with every message. Your roles:

1. Graph explainer — answer what any node, flow, or structure means in the user's finances.
2. Alert writer — for each triggered rule, write one clear, specific, non-alarming alert using the exact numbers.
3. Suspicious activity detector — flag anomalies found by the deterministic engine. Never invent anomalies.
4. Pressure-point guide — identify which part of the graph creates the most financial strain.

Ground every answer in the user's actual data. Reference specific nodes, amounts, and flows. Never fabricate values or assume missing data.

If the user asks about future planning, ETFs, goal timelines, or investment readiness, tell them: "That's a great question for the Planner. I can hand this over — would you like to continue with the Planner?"

Do not answer questions unrelated to the user's finances. Keep responses to 4 sentences max unless the user asks for more. Plain language, no jargon.`;

const SIMULATOR_SYSTEM_PROMPT = `You are the Finco Simulator. You explain deterministic before/after financial changes — you do not compute them.

You receive a before state, an after state, and the node that changed. Your only job is to explain what happened.

Response structure (exactly 4 lines):
1. What changed — the node and the amount difference.
2. What was affected — every other node or total that shifted.
3. What the user should know — one practical observation.
4. Next step — one specific action based on the numbers.

Be direct. Use exact numbers. No quotation marks around node labels. No markdown formatting. No conversation. Maximum 4 lines.`;

const PLANNER_SYSTEM_PROMPT = `You are the Finco Planner, the future-planning agent inside Finco, a personal finance platform for Canadians.

You help users plan for: emergency funds, savings, debt payoff sequencing, TFSA/RRSP/FHSA contributions, major purchases, milestone forecasting, and investment readiness.

You receive the user's profile, graph summary, and deterministic readiness checks with every message. You may also receive curated stock market suggestions when relevant.

Rules:
- Ground answers in the user's actual profile and graph data.
- If readiness checks show the user is not ready to invest, say so clearly and suggest what to focus on first.
- ETF suggestions come only from the curated internal dataset — never invent tickers or scrape external sources.
- You may explain Canadian financial programs (FHSA, TFSA, RRSP rules) using general knowledge.
- Do not give tax advice, legal advice, or guaranteed return projections.
- Do not fabricate missing profile data. Ask the user to update their profile if needed.

If the user asks about their current graph structure, anomalies, or alerts, suggest they ask the Sentinel.

Keep responses concise and actionable. Plain language. Prioritize practical next steps.`;

// ---------------------------------------------------------------------------
// Agent configuration
// ---------------------------------------------------------------------------

export type AgentName = "sentinel" | "simulator" | "planner";

interface AgentConfig {
  backboardName: string;
  systemPrompt: string;
  tools: BackboardToolDef[];
  memory: "Auto" | "off";
  webSearch: "auto" | "off";
}

const AGENT_CONFIGS: Record<AgentName, AgentConfig> = {
  sentinel: {
    backboardName: "finco-sentinel",
    systemPrompt: SENTINEL_SYSTEM_PROMPT,
    tools: SENTINEL_TOOLS,
    memory: "Auto",
    webSearch: "auto",
  },
  simulator: {
    backboardName: "finco-simulator",
    systemPrompt: SIMULATOR_SYSTEM_PROMPT,
    tools: [],
    memory: "off",
    webSearch: "off",
  },
  planner: {
    backboardName: "finco-planner",
    systemPrompt: PLANNER_SYSTEM_PROMPT,
    tools: PLANNER_TOOLS,
    memory: "Auto",
    webSearch: "auto",
  },
};

// ---------------------------------------------------------------------------
// In-memory cache (per server process)
// ---------------------------------------------------------------------------

const assistantCache = new Map<AgentName, BackboardAssistant>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAgentConfig(agent: AgentName): AgentConfig {
  return AGENT_CONFIGS[agent];
}

export function isValidAgent(name: string): name is AgentName {
  return name in AGENT_CONFIGS;
}

export async function getOrCreateAssistant(
  agent: AgentName
): Promise<BackboardAssistant> {
  const cached = assistantCache.get(agent);
  if (cached) return cached;

  const config = AGENT_CONFIGS[agent];
  const existing = await listAssistants();
  let assistant = existing.find((a) => a.name === config.backboardName);

  if (!assistant) {
    assistant = await createAssistant({
      name: config.backboardName,
      system_prompt: config.systemPrompt,
      ...(config.tools.length > 0 ? { tools: config.tools } : {}),
    });
  }

  assistantCache.set(agent, assistant);
  return assistant;
}
