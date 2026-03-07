import { NextRequest, NextResponse } from "next/server";
import { generateForecast } from "@/lib/forecast";
import { getDemoFinancialSummary } from "@/lib/demo-data";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "90");

    const summary = getDemoFinancialSummary();

    const forecast = generateForecast(
      {
        current_balance: summary.net_liquid,
        monthly_income: summary.monthly_income,
        monthly_expenses: summary.monthly_expenses - 800,
        recurring_savings: 800,
        debt_obligations: 2650,
      },
      Math.min(days, 365)
    );

    return NextResponse.json(forecast);
  } catch (error) {
    console.error("Forecast API error:", error);
    return NextResponse.json(
      { error: "Failed to generate forecast" },
      { status: 500 }
    );
  }
}
