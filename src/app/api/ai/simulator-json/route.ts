import { NextRequest, NextResponse } from "next/server";
import { generateSimulatorImpactJson } from "@/lib/gemini";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";

function buildGraphState(nodes: FinancialNodeData[], flows: FinancialFlowData[]): string {
  const lines: string[] = ["NODES (id, label, type, currentValue, monthlyFlow):"];
  for (const n of nodes) {
    lines.push(`  ${n.id} | ${n.label} | ${n.type} | ${n.currentValue} | ${n.monthlyFlow}`);
  }
  lines.push("", "FLOWS (id, source, target, amount, frequency):");
  for (const f of flows) {
    lines.push(`  ${f.id} | ${f.source} -> ${f.target} | ${f.amount} | ${f.frequency}`);
  }
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userMessage,
      nodes,
      flows,
    }: {
      userMessage: string;
      nodes: FinancialNodeData[];
      flows: FinancialFlowData[];
    } = body;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json({ error: "userMessage required" }, { status: 400 });
    }
    if (!nodes?.length || !Array.isArray(flows)) {
      return NextResponse.json({ error: "nodes and flows required" }, { status: 400 });
    }

    const graphState = buildGraphState(nodes, flows);
    const data = await generateSimulatorImpactJson(graphState, userMessage);
    return NextResponse.json({ data });
  } catch (e) {
    console.error("Simulator JSON API error:", e);
    return NextResponse.json({ error: "Simulation impact failed" }, { status: 500 });
  }
}
