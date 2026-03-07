import type { FinancialNodeType } from "@/types/graph";

// ---------------------------------------------------------------------------
// Finco node color palette — all blue family, derived from brand #7F7FFA
//
// Edit this single file to change the entire graph color system.
// ---------------------------------------------------------------------------

export const NODE_COLORS: Record<FinancialNodeType, string> = {
  income: "#5B9CF5",     // bright medium blue — active incoming money
  account: "#7F8FBA",    // muted blue-gray — neutral hub / holding
  expense: "#6B7FA0",    // steel blue — outgoing spend
  debt: "#4E6280",       // dark slate blue — obligations
  savings: "#7AAFDA",    // sky blue — safe, stored
  investment: "#5B7FC5", // deeper blue — growth / long-term
};

export function getNodeColor(type: FinancialNodeType): string {
  return NODE_COLORS[type] ?? "#7F8FBA";
}

// Edge styling constants
export const EDGE_COLOR_DEFAULT = "rgba(120, 140, 170, 0.14)";
export const EDGE_COLOR_ACTIVE = "rgba(120, 140, 170, 0.45)";
export const EDGE_ARROW_COLOR = "rgba(120, 140, 170, 0.4)";
