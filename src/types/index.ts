export interface User {
  id: string;
  auth0_id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: "chequing" | "savings" | "credit" | "investment" | "mortgage";
  current_balance: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  label: string;
  category: string;
  amount: number;
  date: string;
  is_recurring: boolean;
}

export type FinancialNodeType =
  | "income"
  | "account"
  | "expense"
  | "debt"
  | "savings"
  | "investment";

export interface FinancialNode {
  id: string;
  user_id: string;
  label: string;
  type: FinancialNodeType;
  current_value: number;
  monthly_weight: number;
  metadata_json: Record<string, unknown>;
}

export interface FinancialEdge {
  id: string;
  user_id: string;
  source_node_id: string;
  target_node_id: string;
  amount: number;
  frequency: "monthly" | "biweekly" | "weekly" | "annual" | "one-time";
  annual_total: number;
}

export interface Goal {
  id: string;
  user_id: string;
  label: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
}

export interface Alert {
  id: string;
  user_id: string;
  type: "warning" | "info" | "danger" | "success";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  created_at: string;
  related_node_id?: string;
  related_transaction_id?: string;
}

export interface Simulation {
  id: string;
  user_id: string;
  label: string;
  type: "add_expense" | "modify_income" | "add_savings" | "remove_income";
  parameters: Record<string, unknown>;
  result_summary: string;
  impact_score: number;
  created_at: string;
}

export interface ForecastPoint {
  date: string;
  projected_balance: number;
  income: number;
  expenses: number;
}

export interface ForecastResult {
  points: ForecastPoint[];
  runway_months: number;
  lowest_balance: number;
  lowest_balance_date: string;
  warnings: string[];
}

export interface SimulationResult {
  before: ForecastResult;
  after: ForecastResult;
  impact: {
    balance_change: number;
    runway_change: number;
    monthly_surplus_change: number;
    risk_level: "low" | "medium" | "high" | "critical";
    summary: string;
    recommendation: string;
  };
}

export interface DashboardSummary {
  total_balance: number;
  monthly_income: number;
  monthly_expenses: number;
  monthly_surplus: number;
  cash_buffer_days: number;
  emergency_fund: number;
  forecast: ForecastResult;
  alerts: Alert[];
  goals: Goal[];
}
