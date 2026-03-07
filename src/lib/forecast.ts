import type { ForecastResult, ForecastPoint } from "@/types";

interface ForecastInput {
  current_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  recurring_savings: number;
  debt_obligations: number;
}

export function generateForecast(
  input: ForecastInput,
  days: number = 90
): ForecastResult {
  const {
    current_balance,
    monthly_income,
    monthly_expenses,
    recurring_savings,
    debt_obligations,
  } = input;

  const points: ForecastPoint[] = [];
  let balance = current_balance;
  let lowestBalance = current_balance;
  let lowestDate = new Date().toISOString().split("T")[0];

  const startDate = new Date();
  const warnings: string[] = [];

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    const dayOfMonth = date.getDate();
    let dayIncome = 0;
    let dayExpense = 0;

    // Income on 1st and 15th (biweekly simulation)
    if (dayOfMonth === 1 || dayOfMonth === 15) {
      dayIncome = monthly_income / 2;
    }

    // Major expenses cluster around month start
    if (dayOfMonth === 1) {
      dayExpense = monthly_expenses * 0.6 + recurring_savings + debt_obligations;
    } else if (dayOfMonth === 15) {
      dayExpense = monthly_expenses * 0.2;
    } else {
      dayExpense = (monthly_expenses * 0.2) / 28;
    }

    balance += dayIncome - dayExpense;

    if (balance < lowestBalance) {
      lowestBalance = balance;
      lowestDate = dateStr;
    }

    points.push({
      date: dateStr,
      projected_balance: Math.round(balance * 100) / 100,
      income: Math.round(dayIncome * 100) / 100,
      expenses: Math.round(dayExpense * 100) / 100,
    });
  }

  const monthlyNet = monthly_income - monthly_expenses - recurring_savings - debt_obligations;
  const runwayMonths =
    monthlyNet > 0 ? Infinity : Math.abs(current_balance / monthlyNet);

  if (lowestBalance < 1000) {
    warnings.push(
      `Cash balance projected to drop below $1,000 around ${lowestDate}`
    );
  }
  if (lowestBalance < 0) {
    warnings.push(
      `WARNING: Projected negative balance of ${lowestBalance.toFixed(0)} around ${lowestDate}`
    );
  }
  if (runwayMonths < 3) {
    warnings.push(
      `Cash runway is only ${runwayMonths.toFixed(1)} months — below 3-month safety threshold`
    );
  }

  return {
    points,
    runway_months: Math.round(runwayMonths * 10) / 10,
    lowest_balance: Math.round(lowestBalance * 100) / 100,
    lowest_balance_date: lowestDate,
    warnings,
  };
}
