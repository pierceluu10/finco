import type { Transaction, Alert } from "@/types";

interface AnomalyInput {
  transactions: Pick<Transaction, "label" | "category" | "amount" | "date" | "is_recurring">[];
}

export function detectAnomalies(input: AnomalyInput): Omit<Alert, "id" | "user_id" | "created_at">[] {
  const { transactions } = input;
  const alerts: Omit<Alert, "id" | "user_id" | "created_at">[] = [];

  // Group by category and compute averages
  const categoryTotals: Record<string, number[]> = {};
  for (const t of transactions) {
    if (t.amount < 0) {
      if (!categoryTotals[t.category]) categoryTotals[t.category] = [];
      categoryTotals[t.category].push(Math.abs(t.amount));
    }
  }

  // Detect unusually large transactions (>2x category average)
  for (const t of transactions) {
    if (t.amount >= 0) continue;
    const amounts = categoryTotals[t.category];
    if (!amounts || amounts.length < 2) continue;

    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const absAmount = Math.abs(t.amount);

    if (absAmount > avg * 2.5 && absAmount > 50) {
      alerts.push({
        type: "warning",
        severity: "medium",
        message: `Unusually large ${t.category} charge: $${absAmount.toFixed(2)} at ${t.label} (avg: $${avg.toFixed(2)})`,
      });
    }
  }

  // Detect potential duplicate charges
  const seen = new Map<string, { date: string; amount: number }>();
  for (const t of transactions) {
    if (!t.is_recurring || t.amount >= 0) continue;
    const key = `${t.label}-${t.amount}`;
    const prev = seen.get(key);

    if (prev) {
      const daysBetween = Math.abs(
        (new Date(t.date).getTime() - new Date(prev.date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysBetween < 25 && daysBetween > 1) {
        alerts.push({
          type: "danger",
          severity: "high",
          message: `Possible duplicate charge: ${t.label} ($${Math.abs(t.amount).toFixed(2)}) charged ${daysBetween.toFixed(0)} days apart`,
        });
      }
    }
    seen.set(key, { date: t.date, amount: t.amount });
  }

  // Detect month-over-month category spikes
  const monthlyCategory: Record<string, Record<string, number>> = {};
  for (const t of transactions) {
    if (t.amount >= 0) continue;
    const month = t.date.substring(0, 7);
    if (!monthlyCategory[t.category]) monthlyCategory[t.category] = {};
    if (!monthlyCategory[t.category][month]) monthlyCategory[t.category][month] = 0;
    monthlyCategory[t.category][month] += Math.abs(t.amount);
  }

  for (const [category, months] of Object.entries(monthlyCategory)) {
    const sortedMonths = Object.keys(months).sort();
    if (sortedMonths.length < 2) continue;

    const current = months[sortedMonths[sortedMonths.length - 1]];
    const previous = months[sortedMonths[sortedMonths.length - 2]];

    if (previous > 0 && current > previous * 1.3 && current - previous > 30) {
      const pctIncrease = ((current - previous) / previous) * 100;
      alerts.push({
        type: "warning",
        severity: "medium",
        message: `${category} spending up ${pctIncrease.toFixed(0)}% month-over-month ($${previous.toFixed(0)} → $${current.toFixed(0)})`,
      });
    }
  }

  return alerts;
}
