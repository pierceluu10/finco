// ---------------------------------------------------------------------------
// Domain types — represent the user's financial system
// ---------------------------------------------------------------------------

export type FinancialNodeType =
  | "income"
  | "account"
  | "expense"
  | "debt"
  | "savings"
  | "investment";

export interface FinancialNodeData {
  id: string;
  label: string;
  type: FinancialNodeType;
  currentValue: number;
  monthlyFlow: number;
  metadata: Record<string, unknown>;
}

export interface FinancialFlowData {
  id: string;
  source: string;
  target: string;
  amount: number;
  frequency: "monthly" | "biweekly" | "weekly" | "annual" | "one-time";
}

// ---------------------------------------------------------------------------
// React Flow rendering data — attached to RF Node.data / Edge.data
// ---------------------------------------------------------------------------

export interface NodeRfData {
  label: string;
  type: FinancialNodeType;
  currentValue: number;
  monthlyFlow: number;
  radius: number;
  color: string;
  showLabel: boolean;
  metadata: Record<string, unknown>;
}

export interface EdgeRfData {
  amount: number;
  frequency: string;
  sourceLabel: string;
  targetLabel: string;
}

// ---------------------------------------------------------------------------
// UI state
// ---------------------------------------------------------------------------

export type DialogMode = "add" | "edit";

export interface DeletionImpact {
  node: FinancialNodeData;
  inboundFlows: FinancialFlowData[];
  outboundFlows: FinancialFlowData[];
  disconnectedNodeIds: string[];
}
