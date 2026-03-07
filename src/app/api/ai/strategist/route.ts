import { NextRequest, NextResponse } from "next/server";
import { generateStrategistResponse } from "@/lib/gemini";
import { getDemoFinancialSummary, demoGoals, demoAlerts, demoNodes } from "@/lib/demo-data";
import { generateForecast } from "@/lib/forecast";
import { runSimulation } from "@/lib/simulation";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const summary = getDemoFinancialSummary();
    const forecast = generateForecast({
      current_balance: summary.net_liquid,
      monthly_income: summary.monthly_income,
      monthly_expenses: summary.monthly_expenses - 800,
      recurring_savings: 800,
      debt_obligations: 2650,
    });

    // Try to extract simulation intent from the message
    let simulationContext = "";
    const amountMatch = message.match(/\$(\d+)/);
    if (amountMatch && (message.toLowerCase().includes("afford") || message.toLowerCase().includes("car") || message.toLowerCase().includes("payment"))) {
      const amount = parseInt(amountMatch[1]);
      const sim = runSimulation({
        current_balance: summary.net_liquid,
        monthly_income: summary.monthly_income,
        monthly_expenses: summary.monthly_expenses - 800,
        recurring_savings: 800,
        debt_obligations: 2650,
        change_type: "add_expense",
        change_amount: amount,
        change_label: "Simulated expense",
      });
      simulationContext = `\n\nSIMULATION RESULT for adding $${amount}/month expense:
- Monthly surplus change: $${sim.impact.monthly_surplus_change}
- Balance impact over 90 days: $${sim.impact.balance_change}
- Risk level: ${sim.impact.risk_level}
- ${sim.impact.summary}
- ${sim.impact.recommendation}`;
    }

    const context = `
Monthly Income: $${summary.monthly_income}
Monthly Expenses: $${summary.monthly_expenses}
Monthly Surplus: $${summary.monthly_surplus}
Net Liquid Balance: $${summary.net_liquid}
Emergency Fund: $${summary.emergency_fund}
Cash Buffer: ${summary.cash_buffer_days} days
Runway: ${forecast.runway_months === Infinity ? "Indefinite (surplus)" : `${forecast.runway_months} months`}
Lowest Projected Balance: $${forecast.lowest_balance}

Active Goals: ${demoGoals.map((g) => `${g.label}: $${g.current_amount}/$${g.target_amount}`).join(", ")}

Financial Nodes: ${demoNodes.map((n) => `${n.label} (${n.type}): $${n.monthly_weight}/mo`).join(", ")}

Active Alerts: ${demoAlerts.map((a) => a.message).join("; ")}
${simulationContext}`;

    const response = await generateStrategistResponse(message, context);

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Strategist API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
