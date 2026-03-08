import { NextRequest, NextResponse } from "next/server";
import {
  isBackboardConfigured,
  addMessage,
} from "@/lib/backboard/client";
import { getOrCreateAssistant } from "@/lib/backboard/assistants";
import { getOrCreateThread, resolveUserId } from "@/lib/backboard/threads";
import {
  formatSimulationForSimulator,
  type NodeStateRow,
  type ChangedNode,
} from "@/lib/backboard/formatters";
import { generateSimulatorResponse } from "@/lib/gemini";

interface SimulatorRequestBody {
  beforeNodes: NodeStateRow[];
  afterNodes: NodeStateRow[];
  beforeTotals: { income: number; obligations: number; remainingCash: number };
  afterTotals: { income: number; obligations: number; remainingCash: number };
  changedNode: ChangedNode;
  graphState?: string;
  message?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: SimulatorRequestBody = await req.json();

    const hasStructured =
      body.beforeNodes &&
      body.afterNodes &&
      body.beforeTotals &&
      body.afterTotals &&
      body.changedNode;

    if (!hasStructured && !body.graphState) {
      return NextResponse.json(
        {
          error:
            "Provide either structured simulation data (beforeNodes, afterNodes, " +
            "beforeTotals, afterTotals, changedNode) or graphState + message",
        },
        { status: 400 }
      );
    }

    if (isBackboardConfigured() && hasStructured) {
      try {
        const userId = await resolveUserId();
        const assistant = await getOrCreateAssistant("simulator");
        const threadId = await getOrCreateThread(
          userId,
          "simulator",
          assistant.assistant_id
        );

        const content = formatSimulationForSimulator(
          body.beforeNodes,
          body.afterNodes,
          body.beforeTotals,
          body.afterTotals,
          body.changedNode
        );

        const response = await addMessage(threadId, content, {
          memory: "off",
        });

        return NextResponse.json({
          reply: response.content ?? "No response generated.",
        });
      } catch (err) {
        console.error(
          "Backboard simulator error, falling back to Gemini:",
          err
        );
      }
    }

    if (body.graphState && body.message) {
      const reply = await generateSimulatorResponse(
        body.graphState,
        body.message
      );
      return NextResponse.json({ reply });
    }

    return NextResponse.json(
      { error: "Unable to process simulation request" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Simulator API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
