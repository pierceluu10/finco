import { NextRequest, NextResponse } from "next/server";
import { runSimulation } from "@/lib/simulation";
import { getDemoFinancialSummary } from "@/lib/demo-data";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { change_type, change_amount, change_label } = body;

    if (!change_type || change_amount === undefined) {
      return NextResponse.json(
        { error: "change_type and change_amount are required" },
        { status: 400 }
      );
    }

    if (typeof change_amount !== "number" || change_amount < 0 || change_amount > 100000) {
      return NextResponse.json(
        { error: "change_amount must be a number between 0 and 100000" },
        { status: 400 }
      );
    }

    const validTypes = ["add_expense", "modify_income", "add_savings", "remove_income"];
    if (!validTypes.includes(change_type)) {
      return NextResponse.json(
        { error: `change_type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const summary = getDemoFinancialSummary();

    const result = runSimulation({
      current_balance: summary.net_liquid,
      monthly_income: summary.monthly_income,
      monthly_expenses: summary.monthly_expenses - 800,
      recurring_savings: 800,
      debt_obligations: 2650,
      change_type,
      change_amount,
      change_label: change_label || "Simulated change",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Simulation API error:", error);
    return NextResponse.json(
      { error: "Failed to run simulation" },
      { status: 500 }
    );
  }
}
