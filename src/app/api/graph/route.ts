import { NextResponse } from "next/server";
import { demoNodes, demoEdges } from "@/lib/demo-data";

export async function GET() {
  try {
    return NextResponse.json({
      nodes: demoNodes,
      edges: demoEdges,
    });
  } catch (error) {
    console.error("Graph API error:", error);
    return NextResponse.json(
      { error: "Failed to load graph data" },
      { status: 500 }
    );
  }
}
