import type { FinancialNodeType } from "@/types/graph";

// ---------------------------------------------------------------------------
// Finco node color palette — hue variations of brand #7F7FFA (HSL 240 94% 74%)
//
// Edit this single file to change the entire graph color system.
// ---------------------------------------------------------------------------

export const NODE_COLORS: Record<FinancialNodeType, string> = {
  income:     "#8FA5FF", // lighter blue-lavender — incoming money
  account:    "#7F7FFA", // base indigo — neutral hub
  expense:    "#A07FFF", // purple-shifted — outgoing spend
  debt:       "#6E6EE8", // deeper muted indigo — obligations
  savings:    "#7F9FFF", // blue-shifted — safe, stored
  investment: "#B580FF", // violet-shifted — growth / long-term
};

export function getNodeColor(type: FinancialNodeType): string {
  return NODE_COLORS[type] ?? "#7F7FFA";
}

// Edge styling constants — tinted toward #7F7FFA family
export const EDGE_COLOR_DEFAULT = "rgba(127, 127, 250, 0.12)";
export const EDGE_COLOR_ACTIVE = "rgba(127, 127, 250, 0.4)";
export const EDGE_ARROW_COLOR = "rgba(127, 127, 250, 0.35)";
