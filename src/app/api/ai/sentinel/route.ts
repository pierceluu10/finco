import { NextRequest, NextResponse } from "next/server";
import { isBackboardConfigured, addMessage, submitToolOutputs } from "@/lib/backboard/client";
import { getOrCreateAssistant, getAgentConfig } from "@/lib/backboard/assistants";
import { getOrCreateThread, resolveUserId } from "@/lib/backboard/threads";
import { formatGraphStateForSentinel } from "@/lib/backboard/formatters";
import { handleToolCall, type GraphContext } from "@/lib/backboard/tools";
import { checkSentinelRules, calculateFinancialMetrics } from "@/lib/rules/sentinel-rules";
import { generateSentinelResponse } from "@/lib/gemini";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";

interface SentinelRequestBody {
  nodes?: FinancialNodeData[];
  flows?: FinancialFlowData[];
  graphState?: string;
  message?: string;
  selectedNodeId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: SentinelRequestBody = await req.json();
    const hasStructured = body.nodes && body.flows;

    if (!hasStructured && !body.graphState) {
      return NextResponse.json(
        { error: "Provide either structured graph data (nodes, flows) or graphState" },
        { status: 400 }
      );
    }

    if (isBackboardConfigured() && hasStructured) {
      try {
        const nodes = body.nodes!;
        const flows = body.flows!;

        const metrics = calculateFinancialMetrics(nodes, flows);
        const triggeredRules = checkSentinelRules(nodes, flows, metrics);
        const userMessage = body.message || "Analyze my financial graph for risks and alerts.";

        const userId = await resolveUserId();
        const assistant = await getOrCreateAssistant("sentinel");
        const config = getAgentConfig("sentinel");
        const threadId = await getOrCreateThread(userId, "sentinel", assistant.assistant_id);

        const content = formatGraphStateForSentinel(nodes, flows, userMessage, {
          triggeredRules,
          calculatedValues: metrics,
          selectedNodeId: body.selectedNodeId,
        });

        let response = await addMessage(threadId, content, {
          memory: config.memory,
        });

        const graphContext: GraphContext = { nodes, flows };
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
          triggeredRules,
          metrics,
        });
      } catch (err) {
        console.error("Backboard sentinel error, falling back to Gemini:", err);
      }
    }

    if (body.graphState) {
      const reply = await generateSentinelResponse(
        body.graphState,
        body.message || "Analyze my financial graph for risks and alerts."
      );
      return NextResponse.json({ reply });
    }

    return NextResponse.json({ error: "Unable to process sentinel request" }, { status: 400 });
  } catch (error) {
    console.error("Sentinel API error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
