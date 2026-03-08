import { NextRequest, NextResponse } from "next/server";
import { generateSentinelJson } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessage = typeof body.userMessage === "string" ? body.userMessage : "";
    if (!userMessage) {
      return NextResponse.json({ error: "userMessage required" }, { status: 400 });
    }
    const data = await generateSentinelJson(userMessage);
    return NextResponse.json({ data });
  } catch (e) {
    console.error("Sentinel JSON API error:", e);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
