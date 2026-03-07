"use client";

import { getNodeColor } from "@/lib/graph-theme";
import type { FinancialNodeType } from "@/types/graph";

const categories: { type: FinancialNodeType; label: string }[] = [
  { type: "income", label: "Income" },
  { type: "account", label: "Account" },
  { type: "expense", label: "Expense" },
  { type: "debt", label: "Debt" },
  { type: "savings", label: "Savings" },
  { type: "investment", label: "Investment" },
];

export function GraphLegend() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-zinc-950/80 backdrop-blur-sm px-3 py-1.5">
      {categories.map((cat) => (
        <div key={cat.type} className="flex items-center gap-1.5">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: getNodeColor(cat.type), opacity: 0.8 }}
          />
          <span className="text-[10px] text-zinc-500">{cat.label}</span>
        </div>
      ))}
    </div>
  );
}
