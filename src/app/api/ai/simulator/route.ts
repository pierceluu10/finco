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
import { validateSimulatorOutput } from "@/lib/backboard/validators";
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

        let response = await addMessage(threadId, content, {
          memory: "off",
        });

        let reply = response.content ?? "No response generated.";
        const validation = validateSimulatorOutput(reply);

        if (!validation.valid && validation.correctionPrompt) {
          try {
            const retryResponse = await addMessage(threadId, validation.correctionPrompt, {
              memory: "off",
            });
            reply = retryResponse.content ?? validation.cleanedOutput;
          } catch {
            reply = validation.cleanedOutput;
          }
        } else {
          reply = validation.cleanedOutput;
        }

        return NextResponse.json({ reply });
      } catch (err) {
        console.error(
          "Backboard simulator error, falling back to Gemini:",
          err
        );
      }
    }

    if (body.graphState && body.message) {
      const rawReply = await generateSimulatorResponse(
        body.graphState,
        body.message
      );
      const validation = validateSimulatorOutput(rawReply);
      return NextResponse.json({ reply: validation.cleanedOutput });
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
