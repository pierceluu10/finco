import { NextRequest, NextResponse } from "next/server";
import { generateLibrarianResponse } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { graphState, message } = await req.json();

    if (!graphState || !message) {
      return NextResponse.json(
        { error: "Both graphState and message are required" },
        { status: 400 }
      );
    }

    const reply = await generateLibrarianResponse(graphState, message);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Librarian API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
