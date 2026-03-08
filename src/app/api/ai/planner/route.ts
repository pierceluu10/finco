import { NextRequest, NextResponse } from "next/server";
import { isBackboardConfigured, addMessage, submitToolOutputs } from "@/lib/backboard/client";
import { getOrCreateAssistant, getAgentConfig } from "@/lib/backboard/assistants";
import { getOrCreateThread, resolveUserId } from "@/lib/backboard/threads";
import { formatPlannerPayload } from "@/lib/backboard/formatters";
import { handleToolCall, type GraphContext } from "@/lib/backboard/tools";
import { calculateFinancialMetrics } from "@/lib/rules/sentinel-rules";
import { checkInvestmentReadiness } from "@/lib/planner/readiness";
import { getServiceClient } from "@/lib/supabase";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";
import type { UserProfile } from "@/types/profile";

interface PlannerRequestBody {
  nodes?: FinancialNodeData[];
  flows?: FinancialFlowData[];
  graphState?: string;
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: PlannerRequestBody = await req.json();

    if (!body.message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const userId = await resolveUserId();

    // Fetch profile
    let profile: UserProfile | null = null;
    try {
      const supa = getServiceClient();
      const { data } = await supa
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      profile = data as UserProfile | null;
    } catch {
      // Profile may not exist yet
    }

    const hasStructured = body.nodes && body.flows;
    const nodes = body.nodes ?? [];
    const flows = body.flows ?? [];

    const metrics = hasStructured ? calculateFinancialMetrics(nodes, flows) : {
      totalMonthlyIncome: 0,
      totalMonthlyObligations: 0,
      totalSavingsBalance: 0,
      emergencyRunwayMonths: 0,
      debtToIncomeRatio: 0,
    };

    const readiness = checkInvestmentReadiness(profile, metrics);

    if (isBackboardConfigured()) {
      try {
        const assistant = await getOrCreateAssistant("planner");
        const config = getAgentConfig("planner");
        const threadId = await getOrCreateThread(userId, "planner", assistant.assistant_id);

        const content = formatPlannerPayload(
          profile,
          {
            totalIncome: metrics.totalMonthlyIncome,
            totalObligations: metrics.totalMonthlyObligations,
            totalSavings: metrics.totalSavingsBalance,
            debtToIncomeRatio: metrics.debtToIncomeRatio,
            emergencyRunwayMonths: metrics.emergencyRunwayMonths,
          },
          readiness,
          body.message
        );

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
          readiness,
        });
      } catch (err) {
        console.error("Backboard planner error, falling back to Gemini:", err);
      }
    }

    // Gemini fallback
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("GEMINI_API_KEY not configured");

      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const payload = formatPlannerPayload(
        profile,
        {
          totalIncome: metrics.totalMonthlyIncome,
          totalObligations: metrics.totalMonthlyObligations,
          totalSavings: metrics.totalSavingsBalance,
          debtToIncomeRatio: metrics.debtToIncomeRatio,
          emergencyRunwayMonths: metrics.emergencyRunwayMonths,
        },
        readiness,
        body.message
      );

      const result = await model.generateContent([
        { text: "You are the Finco Planner, a financial planning agent for Canadians. Help with future planning: first home savings, emergency funds, debt payoff, TFSA/RRSP/FHSA contributions, and investment readiness. Be concise, grounded in the data provided, and practical." },
        { text: payload },
      ]);

      return NextResponse.json({
        reply: result.response.text(),
        readiness,
      });
    } catch (geminiErr) {
      console.error("Gemini planner error:", geminiErr);
      return NextResponse.json({ error: "Failed to generate planner response" }, { status: 500 });
    }
  } catch (error) {
    console.error("Planner API error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
