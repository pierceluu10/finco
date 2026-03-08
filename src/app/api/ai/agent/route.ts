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
  formatGraphStateForLibrarian,
  wrapRawGraphState,
} from "@/lib/backboard/formatters";
import {
  checkSentinelRules,
  calculateFinancialMetrics,
} from "@/lib/rules/sentinel-rules";
import { formatSentinelPayload } from "@/lib/backboard/formatters";
import {
  generateLibrarianResponse,
  generateSimulatorResponse,
  generateSentinelResponse,
} from "@/lib/gemini";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";

const geminiHandlers: Record<
  string,
  (gs: string, msg: string) => Promise<string>
> = {
  librarian: generateLibrarianResponse,
  simulator: generateSimulatorResponse,
  sentinel: generateSentinelResponse,
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
    }: {
      agent: string;
      graphState?: string;
      message: string;
      nodes?: FinancialNodeData[];
      flows?: FinancialFlowData[];
    } = body;

    if (!agent || !message) {
      return NextResponse.json(
        { error: "agent and message are required" },
        { status: 400 }
      );
    }

    if (!isValidAgent(agent)) {
      return NextResponse.json(
        { error: `Unknown agent: ${agent}` },
        { status: 400 }
      );
    }

    const agentName = agent as AgentName;
    const hasStructured = nodes && nodes.length > 0 && flows;

    if (isBackboardConfigured()) {
      try {
        const userId = await resolveUserId();
        const assistant = await getOrCreateAssistant(agentName);
        const config = getAgentConfig(agentName);
        const threadId = await getOrCreateThread(
          userId,
          agentName,
          assistant.assistant_id
        );

        let content: string;

        if (agentName === "librarian") {
          content = hasStructured
            ? formatGraphStateForLibrarian(nodes!, flows!, message)
            : graphState
              ? wrapRawGraphState(graphState, message)
              : message;
        } else if (agentName === "sentinel" && hasStructured) {
          const metrics = calculateFinancialMetrics(nodes!, flows!);
          const triggered = checkSentinelRules(nodes!, flows!, metrics);
          if (triggered.length === 0) {
            return NextResponse.json({
              reply:
                "No financial alerts at this time. All monitored rules are within safe thresholds.",
            });
          }
          content = formatSentinelPayload(nodes!, flows!, metrics, triggered);
        } else {
          content = graphState
            ? wrapRawGraphState(graphState, message)
            : message;
        }

        let response = await addMessage(threadId, content, {
          memory: config.memory,
        });

        const graphContext: GraphContext = {
          nodes: nodes ?? [],
          flows: flows ?? [],
        };

        let rounds = 0;
        while (
          response.status === "REQUIRES_ACTION" &&
          response.tool_calls &&
          response.run_id &&
          rounds < 3
        ) {
          const toolOutputs = response.tool_calls.map((tc) => ({
            tool_call_id: tc.id,
            output: handleToolCall(tc, graphContext),
          }));
          response = await submitToolOutputs(
            threadId,
            response.run_id,
            toolOutputs
          );
          rounds++;
        }

        return NextResponse.json({
          reply: response.content ?? "No response generated.",
        });
      } catch (err) {
        console.error(
          `Backboard ${agent} error, falling back to Gemini:`,
          err
        );
      }
    }

    const handler = geminiHandlers[agent];
    if (!handler) {
      return NextResponse.json(
        { error: `Unknown agent: ${agent}` },
        { status: 400 }
      );
    }

    const reply = await handler(graphState || "", message);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Agent API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
