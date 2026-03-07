import { generateForecast } from "./forecast";
import type { SimulationResult } from "@/types";

interface SimulationInput {
  current_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  recurring_savings: number;
  debt_obligations: number;
  change_type: "add_expense" | "modify_income" | "add_savings" | "remove_income";
  change_amount: number;
  change_label: string;
}

export function runSimulation(input: SimulationInput): SimulationResult {
  const {
    current_balance,
    monthly_income,
    monthly_expenses,
    recurring_savings,
    debt_obligations,
    change_type,
    change_amount,
  } = input;

  const baseInput = {
    current_balance,
    monthly_income,
    monthly_expenses,
    recurring_savings,
    debt_obligations,
  };

  const before = generateForecast(baseInput, 90);

  const modifiedInput = { ...baseInput };

  switch (change_type) {
    case "add_expense":
      modifiedInput.monthly_expenses += change_amount;
      break;
    case "modify_income":
      modifiedInput.monthly_income += change_amount;
      break;
    case "add_savings":
      modifiedInput.recurring_savings += change_amount;
      break;
    case "remove_income":
      modifiedInput.monthly_income -= change_amount;
      break;
  }

  const after = generateForecast(modifiedInput, 90);

  const beforeSurplus =
    baseInput.monthly_income -
    baseInput.monthly_expenses -
    baseInput.recurring_savings -
    baseInput.debt_obligations;
  const afterSurplus =
    modifiedInput.monthly_income -
    modifiedInput.monthly_expenses -
    modifiedInput.recurring_savings -
    modifiedInput.debt_obligations;

  const balanceChange =
    after.points[after.points.length - 1].projected_balance -
    before.points[before.points.length - 1].projected_balance;

  const runwayChange = after.runway_months - before.runway_months;
  const surplusChange = afterSurplus - beforeSurplus;

  let riskLevel: "low" | "medium" | "high" | "critical";
  if (afterSurplus < 0) riskLevel = "critical";
  else if (afterSurplus < 200) riskLevel = "high";
  else if (afterSurplus < 500) riskLevel = "medium";
  else riskLevel = "low";

  let summary: string;
  let recommendation: string;

  if (riskLevel === "critical") {
    summary = `This change would put you in a monthly deficit of $${Math.abs(afterSurplus).toFixed(0)}. Your expenses would exceed income.`;
    recommendation = `This is not sustainable. You would need to cut $${Math.abs(afterSurplus).toFixed(0)}/month elsewhere or increase income.`;
  } else if (riskLevel === "high") {
    summary = `Feasible but tight. Your monthly surplus drops to $${afterSurplus.toFixed(0)}, leaving minimal room for unexpected expenses.`;
    recommendation = `Consider reducing discretionary spending by $${(500 - afterSurplus).toFixed(0)}/month to maintain a healthy buffer.`;
  } else if (riskLevel === "medium") {
    summary = `Manageable with adjustments. Monthly surplus of $${afterSurplus.toFixed(0)} still covers basics but limits flexibility.`;
    recommendation = `This works if you maintain spending discipline. Watch dining and discretionary categories.`;
  } else {
    summary = `Comfortable. Your monthly surplus remains at $${afterSurplus.toFixed(0)} after this change.`;
    recommendation = `This fits well within your budget. No significant adjustments needed.`;
  }

  return {
    before,
    after,
    impact: {
      balance_change: Math.round(balanceChange),
      runway_change: Math.round(runwayChange * 10) / 10,
      monthly_surplus_change: Math.round(surplusChange),
      risk_level: riskLevel,
      summary,
      recommendation,
    },
  };
}
