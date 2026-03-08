/**
 * Deterministic rules engine for the Finco Sentinel.
 *
 * This engine inspects the full current graph state, computes aggregate
 * financial metrics, and returns an array of triggered rule objects.
 * The Sentinel agent does NOT detect these rules — this engine does.
 */

import type { FinancialNodeData, FinancialFlowData } from "@/types/graph";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TriggeredRule {
  ruleId: string;
  description: string;
}

export interface CalculatedValues {
  totalMonthlyIncome: number;
  totalMonthlyObligations: number;
  totalSavingsBalance: number;
  emergencyRunwayMonths: number;
  debtToIncomeRatio: number;
}

// ---------------------------------------------------------------------------
// Metric computation
// ---------------------------------------------------------------------------

export function calculateFinancialMetrics(
  nodes: FinancialNodeData[],
  _flows: FinancialFlowData[]
): CalculatedValues {
  let totalMonthlyIncome = 0;
  let totalMonthlyObligations = 0;
  let totalSavingsBalance = 0;
  let totalMonthlyDebtPayments = 0;

  for (const node of nodes) {
    switch (node.type) {
      case "income":
        totalMonthlyIncome += node.monthlyFlow;
        break;
      case "expense":
        totalMonthlyObligations += node.monthlyFlow;
        break;
      case "debt":
        totalMonthlyObligations += node.monthlyFlow;
        totalMonthlyDebtPayments += node.monthlyFlow;
        break;
      case "savings":
        totalMonthlyObligations += node.monthlyFlow;
        totalSavingsBalance += node.currentValue;
        break;
      case "investment":
        totalMonthlyObligations += node.monthlyFlow;
        break;
    }
  }

  const emergencyRunwayMonths =
    totalMonthlyObligations > 0
      ? totalSavingsBalance / totalMonthlyObligations
      : Infinity;

  const debtToIncomeRatio =
    totalMonthlyIncome > 0
      ? totalMonthlyDebtPayments / totalMonthlyIncome
      : 0;

  return {
    totalMonthlyIncome,
    totalMonthlyObligations,
    totalSavingsBalance,
    emergencyRunwayMonths: Math.round(emergencyRunwayMonths * 10) / 10,
    debtToIncomeRatio: Math.round(debtToIncomeRatio * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Rules check
// ---------------------------------------------------------------------------

export function checkSentinelRules(
  nodes: FinancialNodeData[],
  flows: FinancialFlowData[],
  metrics?: CalculatedValues
): TriggeredRule[] {
  const m = metrics ?? calculateFinancialMetrics(nodes, flows);
  const triggered: TriggeredRule[] = [];

  // low_runway: savings / obligations < 3 months
  if (m.emergencyRunwayMonths < 3 && m.totalMonthlyObligations > 0) {
    triggered.push({
      ruleId: "low_runway",
      description:
        `Total savings (${m.totalSavingsBalance}) divided by total monthly ` +
        `obligations (${m.totalMonthlyObligations}) is ` +
        `${m.emergencyRunwayMonths} months, which is less than 3 months`,
    });
  }

  // idle_cash: any buffer-like node with amount > 500 and zero outbound edges
  for (const node of nodes) {
    if (
      (node.type === "savings" || node.type === "account") &&
      node.currentValue > 500
    ) {
      const hasOutbound = flows.some((f) => f.source === node.id);
      if (!hasOutbound) {
        triggered.push({
          ruleId: "idle_cash",
          description:
            `Node "${node.label}" has $${node.currentValue} with zero outbound flows`,
        });
      }
    }
  }

  // high_debt_ratio: debt payments / income > 0.5
  if (m.debtToIncomeRatio > 0.5) {
    triggered.push({
      ruleId: "high_debt_ratio",
      description:
        `Monthly debt payments divided by monthly income exceeds 50% ` +
        `(ratio: ${m.debtToIncomeRatio})`,
    });
  }

  // no_investments: zero nodes of type "investment"
  const hasInvestments = nodes.some((n) => n.type === "investment");
  if (!hasInvestments) {
    triggered.push({
      ruleId: "no_investments",
      description: "No investment nodes exist in the financial graph",
    });
  }

  // negative_cashflow: income - obligations < 0
  const cashflow = m.totalMonthlyIncome - m.totalMonthlyObligations;
  if (cashflow < 0) {
    triggered.push({
      ruleId: "negative_cashflow",
      description:
        `Total income (${m.totalMonthlyIncome}) minus total obligations ` +
        `(${m.totalMonthlyObligations}) is ${cashflow}, which is negative`,
    });
  }

  // suspicious_duplicates: multiple expense nodes with the exact same monthly flow (potential double charges)
  const expenseFlows = nodes
    .filter((n) => n.type === "expense" && n.monthlyFlow > 0)
    .map((n) => ({ label: n.label, amount: n.monthlyFlow }));
  const amountCounts = new Map<number, string[]>();
  for (const e of expenseFlows) {
    const existing = amountCounts.get(e.amount) ?? [];
    existing.push(e.label);
    amountCounts.set(e.amount, existing);
  }
  amountCounts.forEach((labels, amount) => {
    if (labels.length >= 2) {
      triggered.push({
        ruleId: "suspicious_duplicates",
        description:
          `${labels.length} expense nodes have the same monthly amount ($${amount}): ${labels.join(", ")}. Possible duplicate charges.`,
      });
    }
  });

  // idle_cash_large: account/savings node with > $10,000 and no outbound flows to investments
  for (const node of nodes) {
    if (
      (node.type === "account" || node.type === "savings") &&
      node.currentValue > 10000
    ) {
      const hasInvestmentFlow = flows.some(
        (f) => f.source === node.id && nodes.find((n) => n.id === f.target)?.type === "investment"
      );
      if (!hasInvestmentFlow) {
        triggered.push({
          ruleId: "idle_cash_large",
          description:
            `"${node.label}" holds $${node.currentValue} with no flows directed toward investments`,
        });
      }
    }
  }

  return triggered;
}
