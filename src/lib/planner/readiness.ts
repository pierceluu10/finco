/**
 * Deterministic investment readiness engine.
 * Computes whether a user is in a position to start investing
 * based on their profile and financial metrics.
 */

import type { UserProfile } from "@/types/profile";
import type { CalculatedValues } from "@/lib/backboard/formatters";

export interface ReadinessResult {
  isReady: boolean;
  primaryConstraint: string | null;
  secondaryConstraints: string[];
  readinessSummary: string;
  riskLevel: string;
}

export function checkInvestmentReadiness(
  profile: UserProfile | null,
  metrics: CalculatedValues
): ReadinessResult {
  const constraints: string[] = [];

  // Negative cashflow
  const netCashflow = metrics.totalMonthlyIncome - metrics.totalMonthlyObligations;
  if (netCashflow < 0) {
    constraints.push("Negative monthly cashflow — spending exceeds income");
  }

  // High debt ratio (> 40%)
  if (metrics.debtToIncomeRatio > 0.4) {
    constraints.push(`High debt-to-income ratio (${(metrics.debtToIncomeRatio * 100).toFixed(0)}%)`);
  }

  // Low emergency runway (< 3 months)
  if (metrics.emergencyRunwayMonths < 3 && metrics.totalMonthlyObligations > 0) {
    constraints.push(`Emergency runway is only ${metrics.emergencyRunwayMonths} months (target: 3–6)`);
  }

  // No income data
  if (metrics.totalMonthlyIncome <= 0) {
    constraints.push("No income detected in the financial graph");
  }

  // Profile-based checks
  if (profile) {
    const targetMonths = profile.emergency_fund_target_months ?? 6;
    if (metrics.emergencyRunwayMonths < targetMonths && metrics.totalMonthlyObligations > 0) {
      const existing = constraints.find((c) => c.includes("Emergency runway"));
      if (!existing) {
        constraints.push(`Emergency fund below personal target of ${targetMonths} months`);
      }
    }
  }

  const isReady = constraints.length === 0;
  const primaryConstraint = constraints[0] ?? null;
  const secondaryConstraints = constraints.slice(1);

  let readinessSummary: string;
  if (isReady) {
    readinessSummary = "Your financial foundation looks stable. You have positive cashflow, a reasonable emergency fund, and manageable debt. You're in a position to consider investing.";
  } else if (constraints.length === 1) {
    readinessSummary = `One issue to address before investing: ${primaryConstraint}. Focus on resolving this first.`;
  } else {
    readinessSummary = `${constraints.length} areas need attention before investing. Start with: ${primaryConstraint}.`;
  }

  const riskLevel = profile?.risk_comfort ?? (isReady ? "moderate" : "low");

  return {
    isReady,
    primaryConstraint,
    secondaryConstraints,
    readinessSummary,
    riskLevel,
  };
}
