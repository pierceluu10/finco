import { NextRequest, NextResponse } from "next/server";
import { isBackboardConfigured, addMessage } from "@/lib/backboard/client";
import { getOrCreateAssistant } from "@/lib/backboard/assistants";
import { getOrCreateThread, resolveUserId } from "@/lib/backboard/threads";
import { formatSentinelPayload } from "@/lib/backboard/formatters";
import {
  checkSentinelRules,
  calculateFinancialMetrics,
} from "@/lib/rules/sentinel-rules";
import { generateSentinelResponse } from "@/lib/gemini";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";

interface SentinelRequestBody {
  nodes?: FinancialNodeData[];
  flows?: FinancialFlowData[];
  graphState?: string;
  message?: string;
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

        if (triggeredRules.length === 0) {
          return NextResponse.json({
            reply: "No financial alerts at this time. All monitored rules are within safe thresholds.",
            triggeredRules: [],
            metrics,
          });
        }

        const userId = await resolveUserId();
        const assistant = await getOrCreateAssistant("sentinel");
        const threadId = await getOrCreateThread(
          userId,
          "sentinel",
          assistant.assistant_id
        );

        const content = formatSentinelPayload(
          nodes,
          flows,
          {
            totalMonthlyIncome: metrics.totalMonthlyIncome,
            totalMonthlyObligations: metrics.totalMonthlyObligations,
            totalSavingsBalance: metrics.totalSavingsBalance,
            emergencyRunwayMonths: metrics.emergencyRunwayMonths,
            debtToIncomeRatio: metrics.debtToIncomeRatio,
          },
          triggeredRules
        );

        const response = await addMessage(threadId, content, {
          memory: "off",
        });

        return NextResponse.json({
          reply: response.content ?? "No response generated.",
          triggeredRules,
          metrics,
        });
      } catch (err) {
        console.error(
          "Backboard sentinel error, falling back to Gemini:",
          err
        );
      }
    }

    if (body.graphState) {
      const reply = await generateSentinelResponse(
        body.graphState,
        body.message || "Analyze my financial graph for risks and alerts."
      );
      return NextResponse.json({ reply });
    }

    return NextResponse.json(
      { error: "Unable to process sentinel request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Sentinel API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
