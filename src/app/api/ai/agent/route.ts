import { NextRequest, NextResponse } from "next/server";
import {
  generateLibrarianResponse,
  generateSimulatorResponse,
  generateSentinelResponse,
} from "@/lib/gemini";

const handlers: Record<
  string,
  (graphState: string, message: string) => Promise<string>
> = {
  librarian: generateLibrarianResponse,
  simulator: generateSimulatorResponse,
  sentinel: generateSentinelResponse,
};

export async function POST(req: NextRequest) {
  try {
    const { agent, graphState, message } = await req.json();

    if (!agent || !graphState || !message) {
      return NextResponse.json(
        { error: "agent, graphState, and message are all required" },
        { status: 400 }
      );
    }

    const handler = handlers[agent as string];
    if (!handler) {
      return NextResponse.json(
        { error: `Unknown agent: ${agent}` },
        { status: 400 }
      );
    }

    const reply = await handler(graphState, message);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Agent API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
