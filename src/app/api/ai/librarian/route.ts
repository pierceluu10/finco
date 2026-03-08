/**
 * @deprecated — Librarian has been merged into Sentinel.
 * This route redirects to the Sentinel for backward compatibility.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  isBackboardConfigured,
  addMessage,
  submitToolOutputs,
} from "@/lib/backboard/client";
import { getOrCreateAssistant } from "@/lib/backboard/assistants";
import { getOrCreateThread, resolveUserId } from "@/lib/backboard/threads";
import { handleToolCall, type GraphContext } from "@/lib/backboard/tools";
import { wrapRawGraphState } from "@/lib/backboard/formatters";
import { generateSentinelResponse } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { graphState, message } = await req.json();

    if (!graphState || !message) {
      return NextResponse.json(
        { error: "Both graphState and message are required" },
        { status: 400 }
      );
    }

    if (isBackboardConfigured()) {
      try {
        const userId = await resolveUserId();
        const assistant = await getOrCreateAssistant("sentinel");
        const threadId = await getOrCreateThread(
          userId,
          "sentinel",
          assistant.assistant_id
        );

        const content = wrapRawGraphState(graphState, message);
        let response = await addMessage(threadId, content, {
          memory: "Auto",
        });

        let rounds = 0;
        while (
          response.status === "REQUIRES_ACTION" &&
          response.tool_calls &&
          response.run_id &&
          rounds < 3
        ) {
          const ctx: GraphContext = { nodes: [], flows: [] };
          const toolOutputs = response.tool_calls.map((tc) => ({
            tool_call_id: tc.id,
            output: handleToolCall(tc, ctx),
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
        console.error("Backboard sentinel (via librarian) error, falling back to Gemini:", err);
      }
    }

    const reply = await generateSentinelResponse(graphState, message);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Librarian (deprecated) API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
