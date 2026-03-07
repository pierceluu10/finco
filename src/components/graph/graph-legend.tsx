"use client";

import { getNodeColor } from "@/lib/utils";

const categories = [
  { type: "income", label: "Income" },
  { type: "account", label: "Account" },
  { type: "expense", label: "Expense" },
  { type: "debt", label: "Debt" },
  { type: "savings", label: "Savings" },
  { type: "investment", label: "Investment" },
];

export function GraphLegend() {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-white/5 bg-card/80 px-4 py-2 backdrop-blur-sm">
      {categories.map((cat) => (
        <div key={cat.type} className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: getNodeColor(cat.type) }}
          />
          <span className="text-xs text-muted-foreground">{cat.label}</span>
        </div>
      ))}
    </div>
  );
}
