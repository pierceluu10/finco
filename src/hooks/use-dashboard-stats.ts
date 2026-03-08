"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useGraphStore, selectNodes, selectEdges } from "@/stores/graph-store";
import type { FinancialNodeData } from "@/types/graph";

/** Amount used for "income" / "expense" / "obligations": monthlyFlow. */
function flowAmount(n: FinancialNodeData): number {
  return n.monthlyFlow ?? 0;
}

/** Balance used for net worth: currentValue for savings/investment/debt. */
function balanceAmount(n: FinancialNodeData): number {
  return n.currentValue ?? 0;
}

/**
 * Single place dashboard math. All figures derived from store nodes/edges.
 * Consume this in dashboard/sidebar; do not read store directly for metrics.
 */
export function useDashboardStats() {
  const nodes = useGraphStore(useShallow(selectNodes));
  const edges = useGraphStore(useShallow(selectEdges));

  const monthlyIncome = useMemo(
    () =>
      nodes
        .filter((n) => n.type === "income")
        .reduce((sum, n) => sum + flowAmount(n), 0),
    [nodes]
  );

  const monthlyObligations = useMemo(
    () =>
      nodes
        .filter((n) => n.type === "expense" || n.type === "debt")
        .reduce((sum, n) => sum + flowAmount(n), 0),
    [nodes]
  );

  const monthlyCashflow = useMemo(
    () => monthlyIncome - monthlyObligations,
    [monthlyIncome, monthlyObligations]
  );

  const netWorth = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    for (const n of nodes) {
      if (n.type === "savings" || n.type === "investment") assets += balanceAmount(n);
      if (n.type === "debt") liabilities += balanceAmount(n);
    }
    return assets - liabilities;
  }, [nodes]);

  const totalSavingsBalance = useMemo(
    () =>
      nodes
        .filter((n) => n.type === "savings")
        .reduce((sum, n) => sum + balanceAmount(n), 0),
    [nodes]
  );

  const emergencyRunway = useMemo(
    () =>
      monthlyObligations > 0 ? totalSavingsBalance / monthlyObligations : 0,
    [totalSavingsBalance, monthlyObligations]
  );

  const savingsRate = useMemo(() => {
    const savingsContrib = nodes
      .filter((n) => n.type === "savings" || n.type === "investment")
      .reduce((sum, n) => sum + flowAmount(n), 0);
    return monthlyIncome > 0 ? (savingsContrib / monthlyIncome) * 100 : 0;
  }, [nodes, monthlyIncome]);

  const expenseBreakdown = useMemo(
    () =>
      nodes
        .filter((n) => n.type === "expense")
        .map((n) => ({ id: n.id, label: n.label, amount: flowAmount(n) })),
    [nodes]
  );

  const totalExpenses = monthlyObligations;
  const totalIncome = monthlyIncome;
  const nodeCount = nodes.length;
  const flowCount = edges.length;

  return {
    netWorth,
    monthlyIncome,
    monthlyObligations,
    monthlyCashflow,
    emergencyRunway,
    savingsRate,
    expenseBreakdown,
    totalIncome,
    totalExpenses,
    totalSavingsBalance,
    nodeCount,
    flowCount,
  };
}
