/**
 * Server-side formatter utilities that produce the exact required
 * message formats for each Backboard-backed agent.
 */

import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";
import type { UserProfile } from "@/types/profile";

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

export interface ReadinessResult {
  isReady: boolean;
  primaryConstraint: string | null;
  secondaryConstraints: string[];
  readinessSummary: string;
  riskLevel: string;
}

// ---------------------------------------------------------------------------
// Sentinel formatter (replaces old Librarian + Sentinel formatters)
// ---------------------------------------------------------------------------

export function formatGraphStateForSentinel(
  nodes: FinancialNodeData[],
  flows: FinancialFlowData[],
  userMessage: string,
  options?: {
    triggeredRules?: TriggeredRule[];
    calculatedValues?: CalculatedValues;
    selectedNodeId?: string;
  }
): string {
  if (nodes.length === 0) {
    return (
      "Your financial graph is empty. Please add your income, expenses, " +
      "savings, and other financial nodes first.\n\nUSER MESSAGE:\n" + userMessage
    );
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const lines: string[] = [];

  // Selected node context (if user clicked a node)
  if (options?.selectedNodeId) {
    const sn = nodeMap.get(options.selectedNodeId);
    if (sn) {
      lines.push("SELECTED NODE:");
      lines.push(`${sn.label} (${sn.type}) — value: ${sn.currentValue}, monthly flow: ${sn.monthlyFlow}`);
      const inbound = flows.filter((f) => f.target === sn.id);
      const outbound = flows.filter((f) => f.source === sn.id);
      if (inbound.length > 0) {
        lines.push("Receives from: " + inbound.map((f) => `${nodeMap.get(f.source)?.label ?? f.source} ($${f.amount})`).join(", "));
      }
      if (outbound.length > 0) {
        lines.push("Pays to: " + outbound.map((f) => `${nodeMap.get(f.target)?.label ?? f.target} ($${f.amount})`).join(", "));
      }
      lines.push("");
    }
  }

  lines.push("GRAPH STATE:");
  for (const node of nodes) {
    lines.push(`${node.type} | ${node.label} | $${node.currentValue} | $${node.monthlyFlow}/mo`);
  }

  lines.push("");
  lines.push("FLOWS:");
  for (const flow of flows) {
    lines.push(`${nodeMap.get(flow.source)?.label ?? flow.source} → ${nodeMap.get(flow.target)?.label ?? flow.target} $${flow.amount} ${flow.frequency}`);
  }

  if (options?.calculatedValues) {
    const cv = options.calculatedValues;
    lines.push("");
    lines.push("METRICS:");
    lines.push(`Income: $${cv.totalMonthlyIncome}/mo | Obligations: $${cv.totalMonthlyObligations}/mo | Savings: $${cv.totalSavingsBalance} | Runway: ${cv.emergencyRunwayMonths}mo | DTI: ${cv.debtToIncomeRatio}`);
  }

  if (options?.triggeredRules && options.triggeredRules.length > 0) {
    lines.push("");
    lines.push("TRIGGERED RULES:");
    for (const rule of options.triggeredRules) {
      lines.push(`${rule.ruleId}: ${rule.description}`);
    }
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

  lines.push("BEFORE:");
  for (const n of beforeNodes) {
    lines.push(`${n.type} | ${n.label} | $${n.amount}`);
  }
  lines.push(`Totals — income: $${beforeTotals.income}, obligations: $${beforeTotals.obligations}, remaining: $${beforeTotals.remainingCash}`);

  lines.push("");
  lines.push("AFTER:");
  for (const n of afterNodes) {
    lines.push(`${n.type} | ${n.label} | $${n.amount}`);
  }
  lines.push(`Totals — income: $${afterTotals.income}, obligations: $${afterTotals.obligations}, remaining: $${afterTotals.remainingCash}`);

  lines.push("");
  lines.push(`CHANGED: ${changedNode.label} from $${changedNode.oldValue} to $${changedNode.newValue}`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Planner formatter
// ---------------------------------------------------------------------------

export function formatPlannerPayload(
  profile: UserProfile | null,
  graphSummary: { totalIncome: number; totalObligations: number; totalSavings: number; debtToIncomeRatio: number; emergencyRunwayMonths: number },
  readiness: ReadinessResult | null,
  userMessage: string
): string {
  const lines: string[] = [];

  if (profile) {
    lines.push("PROFILE:");
    if (profile.net_monthly_income) lines.push(`Income: $${profile.net_monthly_income}/mo (${profile.pay_frequency ?? "unknown frequency"})`);
    if (profile.province) lines.push(`Province: ${profile.province}`);
    if (profile.housing_status) lines.push(`Housing: ${profile.housing_status} — $${profile.monthly_housing_cost ?? 0}/mo`);
    if (profile.monthly_debt_payments) lines.push(`Debt payments: $${profile.monthly_debt_payments}/mo`);
    if (profile.risk_comfort) lines.push(`Risk comfort: ${profile.risk_comfort}`);
    if (profile.investing_goal) lines.push(`Goal: ${profile.investing_goal}`);
    if (profile.current_investment_experience) lines.push(`Experience: ${profile.current_investment_experience}`);
    if (profile.preferred_account_types && profile.preferred_account_types.length > 0) {
      lines.push(`Preferred accounts: ${profile.preferred_account_types.join(", ")}`);
    }
    if (profile.contribution_priority_order && profile.contribution_priority_order.length > 0) {
      lines.push(`Priorities: ${profile.contribution_priority_order.join(" > ")}`);
    }
    lines.push("");
  }

  lines.push("GRAPH SUMMARY:");
  lines.push(`Income: $${graphSummary.totalIncome}/mo | Obligations: $${graphSummary.totalObligations}/mo | Savings: $${graphSummary.totalSavings} | Runway: ${graphSummary.emergencyRunwayMonths}mo | DTI: ${graphSummary.debtToIncomeRatio}`);

  if (readiness) {
    lines.push("");
    lines.push("READINESS:");
    lines.push(`Ready to invest: ${readiness.isReady ? "Yes" : "No"}`);
    if (readiness.primaryConstraint) lines.push(`Primary constraint: ${readiness.primaryConstraint}`);
    if (readiness.secondaryConstraints.length > 0) lines.push(`Also: ${readiness.secondaryConstraints.join(", ")}`);
    lines.push(`Summary: ${readiness.readinessSummary}`);
  }

  lines.push("");
  lines.push("USER MESSAGE:");
  lines.push(userMessage);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Raw graph-state wrapper (backward compat)
// ---------------------------------------------------------------------------

export function wrapRawGraphState(
  graphStateText: string,
  userMessage: string
): string {
  return `CURRENT GRAPH STATE:\n${graphStateText}\n\nUSER MESSAGE:\n${userMessage}`;
}

// Backward-compatible aliases
export const formatGraphStateForLibrarian = formatGraphStateForSentinel;
export const formatSentinelPayload = (
  nodes: FinancialNodeData[],
  flows: FinancialFlowData[],
  calculated: CalculatedValues,
  triggeredRules: TriggeredRule[]
): string => formatGraphStateForSentinel(nodes, flows, "Generate alerts for the triggered rules below.", { triggeredRules, calculatedValues: calculated });
