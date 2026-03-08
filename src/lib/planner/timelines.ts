/**
 * Deterministic timeline estimation engine.
 * Computes months-to-goal for common financial planning scenarios.
 */

import type { UserProfile } from "@/types/profile";
import type { CalculatedValues } from "@/lib/backboard/formatters";

export interface TimelineEstimate {
  goalType: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  estimatedMonths: number | null;
  feasible: boolean;
  note: string;
}

export function estimateEmergencyFundTimeline(
  profile: UserProfile | null,
  metrics: CalculatedValues
): TimelineEstimate {
  const targetMonths = profile?.emergency_fund_target_months ?? 6;
  const targetAmount = metrics.totalMonthlyObligations * targetMonths;
  const currentAmount = metrics.totalSavingsBalance;
  const gap = targetAmount - currentAmount;

  const netCashflow = metrics.totalMonthlyIncome - metrics.totalMonthlyObligations;
  const monthlyContribution = Math.max(netCashflow * 0.5, 0);

  if (gap <= 0) {
    return {
      goalType: "emergency_fund",
      targetAmount,
      currentAmount,
      monthlyContribution: 0,
      estimatedMonths: 0,
      feasible: true,
      note: "Emergency fund target already met.",
    };
  }

  if (monthlyContribution <= 0) {
    return {
      goalType: "emergency_fund",
      targetAmount,
      currentAmount,
      monthlyContribution: 0,
      estimatedMonths: null,
      feasible: false,
      note: "No surplus available to contribute. Reduce expenses or increase income first.",
    };
  }

  const months = Math.ceil(gap / monthlyContribution);

  return {
    goalType: "emergency_fund",
    targetAmount,
    currentAmount,
    monthlyContribution,
    estimatedMonths: months,
    feasible: true,
    note: `At $${monthlyContribution.toFixed(0)}/mo (50% of surplus), target reached in ~${months} months.`,
  };
}

export function estimateFirstHomeSavings(
  profile: UserProfile | null,
  metrics: CalculatedValues,
  targetDownPayment: number = 50000
): TimelineEstimate {
  const currentSavings = metrics.totalSavingsBalance;
  const gap = targetDownPayment - currentSavings;

  const netCashflow = metrics.totalMonthlyIncome - metrics.totalMonthlyObligations;
  const monthlyContribution = Math.max(netCashflow * 0.3, 0);

  if (gap <= 0) {
    return {
      goalType: "first_home",
      targetAmount: targetDownPayment,
      currentAmount: currentSavings,
      monthlyContribution: 0,
      estimatedMonths: 0,
      feasible: true,
      note: "Down payment target already reached.",
    };
  }

  if (monthlyContribution <= 0) {
    return {
      goalType: "first_home",
      targetAmount: targetDownPayment,
      currentAmount: currentSavings,
      monthlyContribution: 0,
      estimatedMonths: null,
      feasible: false,
      note: "No surplus to allocate toward a down payment.",
    };
  }

  const months = Math.ceil(gap / monthlyContribution);

  return {
    goalType: "first_home",
    targetAmount: targetDownPayment,
    currentAmount: currentSavings,
    monthlyContribution,
    estimatedMonths: months,
    feasible: true,
    note: `At $${monthlyContribution.toFixed(0)}/mo (30% of surplus), target reached in ~${months} months.`,
  };
}

export function estimateGoalTimeline(
  monthlySavings: number,
  targetAmount: number,
  currentAmount: number = 0
): TimelineEstimate {
  const gap = targetAmount - currentAmount;

  if (gap <= 0) {
    return {
      goalType: "custom",
      targetAmount,
      currentAmount,
      monthlyContribution: 0,
      estimatedMonths: 0,
      feasible: true,
      note: "Goal already achieved.",
    };
  }

  if (monthlySavings <= 0) {
    return {
      goalType: "custom",
      targetAmount,
      currentAmount,
      monthlyContribution: 0,
      estimatedMonths: null,
      feasible: false,
      note: "No monthly contribution available for this goal.",
    };
  }

  const months = Math.ceil(gap / monthlySavings);

  return {
    goalType: "custom",
    targetAmount,
    currentAmount,
    monthlyContribution: monthlySavings,
    estimatedMonths: months,
    feasible: true,
    note: `At $${monthlySavings.toFixed(0)}/mo, target reached in ~${months} months.`,
  };
}
