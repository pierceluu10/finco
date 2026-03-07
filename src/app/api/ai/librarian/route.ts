import { NextRequest, NextResponse } from "next/server";
import { generateLibrarianExplanation } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { node } = await req.json();

    if (!node) {
      return NextResponse.json({ error: "Node data required" }, { status: 400 });
    }

    const explanation = await generateLibrarianExplanation(node);

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("Librarian API error:", error);
    return NextResponse.json(
      { error: "Failed to generate explanation" },
      { status: 500 }
    );
  }
}
