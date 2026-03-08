import { NextRequest, NextResponse } from "next/server";
import {
  isBackboardConfigured,
  addMessage,
  submitToolOutputs,
} from "@/lib/backboard/client";
import {
  getOrCreateAssistant,
  getAgentConfig,
  isValidAgent,
  type AgentName,
} from "@/lib/backboard/assistants";
import { getOrCreateThread, resolveUserId } from "@/lib/backboard/threads";
import { handleToolCall, type GraphContext } from "@/lib/backboard/tools";
import {
  formatGraphStateForSentinel,
  wrapRawGraphState,
} from "@/lib/backboard/formatters";
import {
  checkSentinelRules,
  calculateFinancialMetrics,
} from "@/lib/rules/sentinel-rules";
import {
  generateSentinelResponse as generateGeminiSentinel,
  generateSimulatorResponse as generateGeminiSimulator,
} from "@/lib/gemini";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";

const geminiHandlers: Record<string, ((gs: string, msg: string) => Promise<string>) | undefined> = {
  sentinel: generateGeminiSentinel,
  simulator: generateGeminiSimulator,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      agent,
      graphState,
      message,
      nodes,
      flows,
      selectedNodeId,
    }: {
      agent: string;
      graphState?: string;
      message: string;
      nodes?: FinancialNodeData[];
      flows?: FinancialFlowData[];
      selectedNodeId?: string;
    } = body;

    if (!agent || !message) {
      return NextResponse.json({ error: "agent and message are required" }, { status: 400 });
    }

    // Map legacy "librarian" requests to sentinel
    const resolvedAgent = agent === "librarian" ? "sentinel" : agent;

    if (!isValidAgent(resolvedAgent)) {
      return NextResponse.json({ error: `Unknown agent: ${agent}` }, { status: 400 });
    }

    const agentName = resolvedAgent as AgentName;
    const hasStructured = nodes && nodes.length > 0 && flows;

    // Sentinel: if user wants to plan, delegate to Planner
    const planIntent = /\b(plan|planning|planner|i want to plan|help me plan)\b/i.test(message);
    const effectiveAgent = agentName === "sentinel" && planIntent ? "planner" : agentName;

    // Detect what-if / simulator intent for handoff (Sentinel stays as responder but we add handoff hint)
    const simulatorIntent = agentName === "sentinel" && /\b(what if|what would happen|simulate|scenario|how would|would it affect)\b/i.test(message);

    // For planner, redirect to dedicated route
    if (effectiveAgent === "planner") {
      const plannerRes = await fetch(new URL("/api/ai/planner", req.url), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes,
          flows,
          graphState,
          message: planIntent && agentName === "sentinel" ? `[Delegated from Sentinel] ${message}` : message,
        }),
      });
      const plannerData = await plannerRes.json();
      return NextResponse.json(plannerData);
    }

    if (isBackboardConfigured()) {
      try {
        const userId = await resolveUserId();
        const assistant = await getOrCreateAssistant(effectiveAgent as AgentName);
        const config = getAgentConfig(effectiveAgent as AgentName);
        const threadId = await getOrCreateThread(userId, effectiveAgent as AgentName, assistant.assistant_id);

        let content: string;

        if (effectiveAgent === "sentinel") {
          if (hasStructured) {
            const metrics = calculateFinancialMetrics(nodes!, flows!);
            const triggered = checkSentinelRules(nodes!, flows!, metrics);
            content = formatGraphStateForSentinel(nodes!, flows!, message, {
              triggeredRules: triggered,
              calculatedValues: metrics,
              selectedNodeId,
            });
          } else {
            content = graphState ? wrapRawGraphState(graphState, message) : message;
          }
        } else {
          content = graphState ? wrapRawGraphState(graphState, message) : message;
        }

        let response = await addMessage(threadId, content, { memory: config.memory });

        const graphContext: GraphContext = { nodes: nodes ?? [], flows: flows ?? [] };
        let rounds = 0;
        while (response.status === "REQUIRES_ACTION" && response.tool_calls && response.run_id && rounds < 3) {
          const toolOutputs = response.tool_calls.map((tc) => ({
            tool_call_id: tc.id,
            output: handleToolCall(tc, graphContext),
          }));
          response = await submitToolOutputs(threadId, response.run_id, toolOutputs);
          rounds++;
        }

        return NextResponse.json({
          reply: response.content ?? "No response generated.",
          ...(simulatorIntent ? { handoff: { to: "simulator" as const } } : {}),
        });
      } catch (err) {
        console.error(`Backboard ${agent} error, falling back to Gemini:`, err);
      }
    }

    // Gemini fallback
    const handler = geminiHandlers[effectiveAgent] ?? geminiHandlers["sentinel"];
    if (handler) {
      const reply = await handler(graphState || "", message);
      return NextResponse.json({
        reply,
        ...(simulatorIntent ? { handoff: { to: "simulator" as const } } : {}),
      });
    }

    return NextResponse.json({ error: `Unable to process ${agent} request` }, { status: 400 });
  } catch (error) {
    console.error("Agent API error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
