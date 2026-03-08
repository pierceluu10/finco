/**
 * Tool definitions for Backboard assistants and deterministic handlers.
 *
 * Backboard assistants may request these tools. Our backend executes them
 * using deterministic app logic, then submits results back to Backboard.
 */

import type { BackboardToolDef, BackboardToolCall } from "./client";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";

// ---------------------------------------------------------------------------
// Tool definitions (attached to assistants at creation time)
// ---------------------------------------------------------------------------

export const AGENT_TOOLS: BackboardToolDef[] = [
  {
    type: "function",
    function: {
      name: "get_full_graph_state",
      description:
        "Returns the complete financial graph including all nodes, flows, and aggregate values",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_node_detail",
      description:
        "Returns detailed information about a specific financial node and its connected flows",
      parameters: {
        type: "object",
        properties: {
          node_id: {
            type: "string",
            description: "The ID of the node to look up",
          },
        },
        required: ["node_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_summary",
      description:
        "Returns the financial dashboard summary: income, obligations, savings, runway, debt ratio, and active alerts",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Graph context passed to handlers
// ---------------------------------------------------------------------------

export interface GraphContext {
  nodes: FinancialNodeData[];
  flows: FinancialFlowData[];
}

// ---------------------------------------------------------------------------
// Tool dispatcher
// ---------------------------------------------------------------------------

export function handleToolCall(
  toolCall: BackboardToolCall,
  context: GraphContext
): string {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(toolCall.function.arguments || "{}");
  } catch {
    args = {};
  }

  switch (toolCall.function.name) {
    case "get_full_graph_state":
      return handleGetFullGraphState(context);
    case "get_node_detail":
      return handleGetNodeDetail(context, args.node_id as string);
    case "get_dashboard_summary":
      return handleGetDashboardSummary(context);
    default:
      return JSON.stringify({
        error: `Unknown tool: ${toolCall.function.name}`,
      });
  }
}

// ---------------------------------------------------------------------------
// Individual tool handlers (all deterministic)
// ---------------------------------------------------------------------------

function handleGetFullGraphState(ctx: GraphContext): string {
  const nodeMap = new Map(ctx.nodes.map((n) => [n.id, n]));
  const totals = computeTotals(ctx);

  return JSON.stringify({
    nodes: ctx.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      currentValue: n.currentValue,
      monthlyFlow: n.monthlyFlow,
    })),
    flows: ctx.flows.map((f) => ({
      source: nodeMap.get(f.source)?.label ?? f.source,
      target: nodeMap.get(f.target)?.label ?? f.target,
      amount: f.amount,
      frequency: f.frequency,
    })),
    totals,
  });
}

function handleGetNodeDetail(ctx: GraphContext, nodeId: string): string {
  const node = ctx.nodes.find((n) => n.id === nodeId);
  if (!node) return JSON.stringify({ error: "Node not found" });

  const nodeMap = new Map(ctx.nodes.map((n) => [n.id, n]));
  const connectedFlows = ctx.flows.filter(
    (f) => f.source === nodeId || f.target === nodeId
  );

  return JSON.stringify({
    node: {
      id: node.id,
      type: node.type,
      label: node.label,
      currentValue: node.currentValue,
      monthlyFlow: node.monthlyFlow,
      metadata: node.metadata,
    },
    inboundFlows: connectedFlows
      .filter((f) => f.target === nodeId)
      .map((f) => ({
        from: nodeMap.get(f.source)?.label ?? f.source,
        amount: f.amount,
        frequency: f.frequency,
      })),
    outboundFlows: connectedFlows
      .filter((f) => f.source === nodeId)
      .map((f) => ({
        to: nodeMap.get(f.target)?.label ?? f.target,
        amount: f.amount,
        frequency: f.frequency,
      })),
  });
}

function handleGetDashboardSummary(ctx: GraphContext): string {
  const totals = computeTotals(ctx);
  const runway =
    totals.totalObligations > 0
      ? totals.totalSavings / totals.totalObligations
      : Infinity;
  const debtRatio =
    totals.totalIncome > 0
      ? totals.totalDebtPayments / totals.totalIncome
      : 0;

  return JSON.stringify({
    income: totals.totalIncome,
    obligations: totals.totalObligations,
    savings: totals.totalSavings,
    runway_months: Math.round(runway * 10) / 10,
    debt_to_income_ratio: Math.round(debtRatio * 100) / 100,
  });
}

// ---------------------------------------------------------------------------
// Shared deterministic computation
// ---------------------------------------------------------------------------

function computeTotals(ctx: GraphContext) {
  let totalIncome = 0;
  let totalObligations = 0;
  let totalSavings = 0;
  let totalDebtPayments = 0;

  for (const n of ctx.nodes) {
    switch (n.type) {
      case "income":
        totalIncome += n.monthlyFlow;
        break;
      case "expense":
        totalObligations += n.monthlyFlow;
        break;
      case "debt":
        totalObligations += n.monthlyFlow;
        totalDebtPayments += n.monthlyFlow;
        break;
      case "savings":
        totalObligations += n.monthlyFlow;
        totalSavings += n.currentValue;
        break;
      case "investment":
        totalObligations += n.monthlyFlow;
        break;
    }
  }

  return { totalIncome, totalObligations, totalSavings, totalDebtPayments };
}
