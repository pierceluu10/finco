/**
 * Tool definitions for Backboard assistants and deterministic handlers.
 *
 * Backboard assistants may request these tools. Our backend executes them
 * using deterministic app logic, then submits results back to Backboard.
 */

import type { BackboardToolDef, BackboardToolCall } from "./client";
import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";

// ---------------------------------------------------------------------------
// Tool definitions — Sentinel (graph inspection tools)
// ---------------------------------------------------------------------------

export const SENTINEL_TOOLS: BackboardToolDef[] = [
  {
    type: "function",
    function: {
      name: "get_full_graph_state",
      description:
        "Returns the complete financial graph including all nodes, flows, and aggregate values",
      parameters: { type: "object", properties: {}, required: [] },
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
          node_id: { type: "string", description: "The ID of the node to look up" },
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
        "Returns the financial dashboard summary: income, obligations, savings, runway, debt ratio",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool definitions — Planner (readiness + ETF + timeline tools)
// ---------------------------------------------------------------------------

export const PLANNER_TOOLS: BackboardToolDef[] = [
  {
    type: "function",
    function: {
      name: "get_readiness_check",
      description:
        "Runs deterministic investment readiness checks based on the user's profile and graph metrics",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_etf_recommendations",
      description:
        "Returns curated ETF suggestions filtered by the user's risk comfort and account preferences",
      parameters: {
        type: "object",
        properties: {
          risk_level: { type: "string", description: "low, moderate, or high", enum: ["low", "moderate", "high"] },
          account_type: { type: "string", description: "TFSA, RRSP, FHSA, RESP, or Non-registered" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_timeline_estimate",
      description:
        "Estimates months to reach a savings or investment goal given current contributions",
      parameters: {
        type: "object",
        properties: {
          goal_type: { type: "string", description: "emergency_fund, first_home, or custom", enum: ["emergency_fund", "first_home", "custom"] },
          target_amount: { type: "number", description: "Target dollar amount (optional for emergency_fund)" },
        },
        required: ["goal_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_summary",
      description:
        "Returns the financial dashboard summary: income, obligations, savings, runway, debt ratio",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

// Backward-compatible alias
export const AGENT_TOOLS = SENTINEL_TOOLS;

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
    case "get_readiness_check":
      return JSON.stringify({ note: "Readiness data is included in the message payload" });
    case "get_etf_recommendations":
      return handleGetEtfRecommendations(args.risk_level as string, args.account_type as string);
    case "get_timeline_estimate":
      return JSON.stringify({ note: "Timeline data is included in the message payload" });
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` });
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

function handleGetEtfRecommendations(riskLevel?: string, accountType?: string): string {
  try {
    // Dynamic import to avoid bundling ETF data in every route
    const catalog = require("@/lib/etf/etf-catalog");
    let etfs = catalog.getAllEtfs();
    if (riskLevel) etfs = catalog.filterEtfsByRisk(riskLevel);
    if (accountType) {
      etfs = etfs.filter((e: { account_suitability: string[] }) =>
        e.account_suitability.includes(accountType)
      );
    }
    return JSON.stringify({ etfs: etfs.slice(0, 5) });
  } catch {
    return JSON.stringify({ error: "ETF catalog not available" });
  }
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
