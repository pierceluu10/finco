import { NextRequest } from "next/server";
import { streamSimulatorResponse } from "@/lib/gemini";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";

function nodeAmount(n: FinancialNodeData): number {
  return n.type === "income" || n.type === "expense" ? n.monthlyFlow : n.currentValue;
}

function buildBeforeAfterState(
  beforeNodes: FinancialNodeData[],
  afterNodes: FinancialNodeData[],
  flows: FinancialFlowData[],
  changedNodeId: string,
  changedLabel: string,
  oldVal: number,
  newVal: number
): string {
  const lines: string[] = [];
  lines.push("BEFORE (original ecosystem):");
  for (const n of beforeNodes) {
    const amt = nodeAmount(n);
    lines.push(`${n.type} | ${n.label} | currentValue: $${n.currentValue} | monthlyFlow: $${n.monthlyFlow} (display: $${amt})`);
  }
  const beforeIncome = beforeNodes.filter((n) => n.type === "income").reduce((s, n) => s + n.monthlyFlow, 0);
  const beforeObligations = beforeNodes.filter((n) => n.type === "expense" || n.type === "debt").reduce((s, n) => s + n.monthlyFlow, 0);
  lines.push(`Totals — income: $${beforeIncome}/mo, obligations: $${beforeObligations}/mo, remaining: $${beforeIncome - beforeObligations}/mo`);
  lines.push("");
  lines.push("AFTER (simulation with ripple):");
  for (const n of afterNodes) {
    const amt = nodeAmount(n);
    lines.push(`${n.type} | ${n.label} | currentValue: $${n.currentValue} | monthlyFlow: $${n.monthlyFlow} (display: $${amt})`);
  }
  const afterIncome = afterNodes.filter((n) => n.type === "income").reduce((s, n) => s + n.monthlyFlow, 0);
  const afterObligations = afterNodes.filter((n) => n.type === "expense" || n.type === "debt").reduce((s, n) => s + n.monthlyFlow, 0);
  lines.push(`Totals — income: $${afterIncome}/mo, obligations: $${afterObligations}/mo, remaining: $${afterIncome - afterObligations}/mo`);
  lines.push("");
  lines.push("FLOWS (unchanged):");
  for (const f of flows) {
    lines.push(`${f.source} → ${f.target}: $${f.amount} ${f.frequency}`);
  }
  lines.push("");
  lines.push(`CHANGED NODE: ${changedLabel} (id: ${changedNodeId}) from $${oldVal} to $${newVal}. All other changes are from deterministic ripple along flows.`);
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      beforeNodes,
      afterNodes,
      flows,
      changedNodeId,
      changedLabel,
      oldValue,
      newValue,
    }: {
      beforeNodes: FinancialNodeData[];
      afterNodes: FinancialNodeData[];
      flows: FinancialFlowData[];
      changedNodeId: string;
      changedLabel: string;
      oldValue: number;
      newValue: number;
    } = body;

    if (
      !Array.isArray(beforeNodes) ||
      !Array.isArray(afterNodes) ||
      !Array.isArray(flows) ||
      !changedNodeId ||
      changedLabel == null ||
      typeof oldValue !== "number" ||
      typeof newValue !== "number"
    ) {
      return new Response(
        JSON.stringify({ error: "beforeNodes, afterNodes, flows, changedNodeId, changedLabel, oldValue, newValue required" }),
        { status: 400 }
      );
    }

    const state = buildBeforeAfterState(
      beforeNodes,
      afterNodes,
      flows,
      changedNodeId,
      changedLabel,
      oldValue,
      newValue
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamSimulatorResponse(state)) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch {
          controller.enqueue(encoder.encode("\n\n[Error generating response.]"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Simulator stream error:", err);
    return new Response(JSON.stringify({ error: "Simulation stream failed" }), { status: 500 });
  }
}
