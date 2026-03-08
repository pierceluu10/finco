/**
 * Server-side formatter utilities that produce the exact required
 * message formats for each Backboard-backed agent.
 */

import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface NodeStateRow {
  id: string;
  type: string;
  label: string;
  amount: number;
  status?: string;
}

export interface ChangedNode {
  label: string;
  oldValue: number;
  newValue: number;
}

export interface CalculatedValues {
  totalMonthlyIncome: number;
  totalMonthlyObligations: number;
  totalSavingsBalance: number;
  emergencyRunwayMonths: number;
  debtToIncomeRatio: number;
}

export interface TriggeredRule {
  ruleId: string;
  description: string;
}

// ---------------------------------------------------------------------------
// Librarian formatter
// ---------------------------------------------------------------------------

export function formatGraphStateForLibrarian(
  nodes: FinancialNodeData[],
  flows: FinancialFlowData[],
  userMessage: string
): string {
  if (nodes.length === 0) {
    return (
      "Your financial graph is empty. Please add your income, expenses, " +
      "savings, and other financial nodes first before asking questions."
    );
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const lines: string[] = [];

  lines.push("CURRENT GRAPH STATE:");
  lines.push("Nodes:");
  lines.push("");
  for (const node of nodes) {
    const metaParts = Object.entries(node.metadata)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    lines.push(
      `${node.id} ${node.type} ${node.label} ${node.currentValue} CAD` +
        (metaParts ? ` ${metaParts}` : "")
    );
  }

  lines.push("");
  lines.push("Flows:");
  lines.push("");
  for (const flow of flows) {
    const srcLabel = nodeMap.get(flow.source)?.label ?? flow.source;
    const tgtLabel = nodeMap.get(flow.target)?.label ?? flow.target;
    lines.push(
      `${srcLabel} → ${tgtLabel} ${flow.amount} ${flow.frequency} flow`
    );
  }

  lines.push("");
  lines.push("USER MESSAGE:");
  lines.push(userMessage);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Simulator formatter
// ---------------------------------------------------------------------------

export function formatSimulationForSimulator(
  beforeNodes: NodeStateRow[],
  afterNodes: NodeStateRow[],
  beforeTotals: { income: number; obligations: number; remainingCash: number },
  afterTotals: { income: number; obligations: number; remainingCash: number },
  changedNode: ChangedNode
): string {
  const lines: string[] = [];

  lines.push("BEFORE STATE:");
  lines.push("Nodes:");
  lines.push("");
  for (const n of beforeNodes) {
    lines.push(
      `${n.id} ${n.type} ${n.label} ${n.amount} ${n.status ?? "healthy"}`
    );
  }
  lines.push("");
  lines.push(`Total income: ${beforeTotals.income}`);
  lines.push(`Total obligations: ${beforeTotals.obligations}`);
  lines.push(`Remaining cash: ${beforeTotals.remainingCash}`);

  lines.push("");
  lines.push("AFTER STATE:");
  lines.push("Nodes:");
  lines.push("");
  for (const n of afterNodes) {
    lines.push(
      `${n.id} ${n.type} ${n.label} ${n.amount} ${n.status ?? "healthy"}`
    );
  }
  lines.push("");
  lines.push(`Total income: ${afterTotals.income}`);
  lines.push(`Total obligations: ${afterTotals.obligations}`);
  lines.push(`Remaining cash: ${afterTotals.remainingCash}`);

  lines.push("");
  lines.push("CHANGED NODE:");
  lines.push(
    `${changedNode.label} changed from ${changedNode.oldValue} to ${changedNode.newValue}`
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Sentinel formatter
// ---------------------------------------------------------------------------

export function formatSentinelPayload(
  nodes: FinancialNodeData[],
  flows: FinancialFlowData[],
  calculated: CalculatedValues,
  triggeredRules: TriggeredRule[]
): string {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const lines: string[] = [];

  lines.push("CURRENT GRAPH STATE:");
  lines.push("Nodes:");
  lines.push("");
  for (const node of nodes) {
    const metaParts = Object.entries(node.metadata)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    lines.push(
      `${node.id} ${node.type} ${node.label} ${node.currentValue} CAD` +
        (metaParts ? ` ${metaParts}` : "")
    );
  }

  lines.push("");
  lines.push("Flows:");
  lines.push("");
  for (const flow of flows) {
    const srcLabel = nodeMap.get(flow.source)?.label ?? flow.source;
    const tgtLabel = nodeMap.get(flow.target)?.label ?? flow.target;
    lines.push(
      `${srcLabel} → ${tgtLabel} ${flow.amount} ${flow.frequency}`
    );
  }

  lines.push("");
  lines.push("Calculated values:");
  lines.push("");
  lines.push(`Total monthly income: ${calculated.totalMonthlyIncome}`);
  lines.push(
    `Total monthly obligations: ${calculated.totalMonthlyObligations}`
  );
  lines.push(`Total savings balance: ${calculated.totalSavingsBalance}`);
  lines.push(`Emergency runway: ${calculated.emergencyRunwayMonths} months`);
  lines.push(`Debt to income ratio: ${calculated.debtToIncomeRatio}`);

  lines.push("");
  lines.push("TRIGGERED RULES:");
  lines.push("");
  for (const rule of triggeredRules) {
    lines.push(`${rule.ruleId}: ${rule.description}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Raw graph-state wrapper (for backward compat with text-only requests)
// ---------------------------------------------------------------------------

export function wrapRawGraphState(
  graphStateText: string,
  userMessage: string
): string {
  return `CURRENT GRAPH STATE:\n${graphStateText}\n\nUSER MESSAGE:\n${userMessage}`;
}
