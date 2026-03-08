import type { FinancialNodeType } from "@/types/graph";

// ---------------------------------------------------------------------------
// Finco node color palette — distinct per-type colors that work on dark bg
// ---------------------------------------------------------------------------

export const NODE_COLORS: Record<FinancialNodeType, string> = {
  income:     "#4ADE80", // green — money coming in
  account:    "#7F7FFA", // brand indigo — neutral hub
  expense:    "#F87171", // soft red — money going out
  debt:       "#FB923C", // amber/orange — obligations
  savings:    "#38BDF8", // sky blue — safe, stored
  investment: "#A78BFA", // violet — growth / long-term
  buffer:     "#7F7FFA", // brand indigo — buffer/slack
};

export function getNodeColor(type: FinancialNodeType): string {
  return NODE_COLORS[type] ?? "#7F7FFA";
}

export const EDGE_COLOR_DEFAULT = "rgba(127, 127, 250, 0.12)";
export const EDGE_COLOR_ACTIVE = "rgba(127, 127, 250, 0.4)";
export const EDGE_ARROW_COLOR = "rgba(127, 127, 250, 0.35)";

export const HEALTH_POS = "#4ADE80";
export const HEALTH_NEG = "#F87171";
