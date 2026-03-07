import type {
  FinancialNode,
  Account,
  Transaction,
  Goal,
  Alert,
} from "@/types";

const DEMO_USER_ID = "demo-user-001";

export const demoAccounts: Omit<Account, "id">[] = [
  { user_id: DEMO_USER_ID, name: "TD Chequing", type: "chequing", current_balance: 4850 },
  { user_id: DEMO_USER_ID, name: "TD Savings", type: "savings", current_balance: 11500 },
  { user_id: DEMO_USER_ID, name: "TFSA - Wealthsimple", type: "investment", current_balance: 14200 },
  { user_id: DEMO_USER_ID, name: "TD Mortgage", type: "mortgage", current_balance: -387000 },
  { user_id: DEMO_USER_ID, name: "Visa Credit Card", type: "credit", current_balance: -1240 },
];

export const demoNodes: (Omit<FinancialNode, "id" | "user_id"> & { _id: string })[] = [
  { _id: "salary", label: "Salary", type: "income", current_value: 8500, monthly_weight: 8500, metadata_json: { employer: "TechCorp Canada", frequency: "biweekly" } },
  { _id: "chequing", label: "Chequing Account", type: "account", current_value: 4850, monthly_weight: 0, metadata_json: { institution: "TD Bank" } },
  { _id: "mortgage", label: "Mortgage", type: "debt", current_value: 387000, monthly_weight: 2200, metadata_json: { rate: 5.14, remaining_years: 22, institution: "TD Bank" } },
  { _id: "groceries", label: "Groceries", type: "expense", current_value: 0, monthly_weight: 600, metadata_json: { category: "food" } },
  { _id: "utilities", label: "Utilities", type: "expense", current_value: 0, monthly_weight: 180, metadata_json: { includes: ["hydro", "gas", "internet", "phone"] } },
  { _id: "car-payment", label: "Car Payment", type: "debt", current_value: 18500, monthly_weight: 450, metadata_json: { rate: 4.99, remaining_months: 41 } },
  { _id: "subscriptions", label: "Subscriptions", type: "expense", current_value: 0, monthly_weight: 92, metadata_json: { services: ["Netflix", "Spotify", "iCloud", "Gym"] } },
  { _id: "dining", label: "Dining & Takeout", type: "expense", current_value: 0, monthly_weight: 280, metadata_json: {} },
  { _id: "tfsa", label: "TFSA", type: "investment", current_value: 14200, monthly_weight: 500, metadata_json: { institution: "Wealthsimple", contribution_room: 6500 } },
  { _id: "emergency", label: "Emergency Fund", type: "savings", current_value: 11500, monthly_weight: 300, metadata_json: { target: 25000 } },
  { _id: "transport", label: "Transportation", type: "expense", current_value: 0, monthly_weight: 120, metadata_json: { includes: ["gas", "parking", "transit"] } },
  { _id: "insurance", label: "Insurance", type: "expense", current_value: 0, monthly_weight: 185, metadata_json: { includes: ["home", "auto", "life"] } },
];

export const demoEdges: { source: string; target: string; amount: number; frequency: "monthly" | "biweekly" }[] = [
  { source: "salary", target: "chequing", amount: 8500, frequency: "monthly" },
  { source: "chequing", target: "mortgage", amount: 2200, frequency: "monthly" },
  { source: "chequing", target: "groceries", amount: 600, frequency: "monthly" },
  { source: "chequing", target: "utilities", amount: 180, frequency: "monthly" },
  { source: "chequing", target: "car-payment", amount: 450, frequency: "monthly" },
  { source: "chequing", target: "subscriptions", amount: 92, frequency: "monthly" },
  { source: "chequing", target: "dining", amount: 280, frequency: "monthly" },
  { source: "chequing", target: "tfsa", amount: 500, frequency: "monthly" },
  { source: "chequing", target: "emergency", amount: 300, frequency: "monthly" },
  { source: "chequing", target: "transport", amount: 120, frequency: "monthly" },
  { source: "chequing", target: "insurance", amount: 185, frequency: "monthly" },
];

export const demoTransactions: Omit<Transaction, "id" | "user_id" | "account_id">[] = [
  { label: "Salary Deposit", category: "income", amount: 4250, date: "2026-03-01", is_recurring: true },
  { label: "Salary Deposit", category: "income", amount: 4250, date: "2026-02-15", is_recurring: true },
  { label: "TD Mortgage Payment", category: "housing", amount: -2200, date: "2026-03-01", is_recurring: true },
  { label: "Loblaws", category: "groceries", amount: -142.38, date: "2026-03-03", is_recurring: false },
  { label: "No Frills", category: "groceries", amount: -87.92, date: "2026-02-28", is_recurring: false },
  { label: "Costco", category: "groceries", amount: -234.15, date: "2026-02-22", is_recurring: false },
  { label: "Hydro One", category: "utilities", amount: -98.50, date: "2026-03-02", is_recurring: true },
  { label: "Rogers Internet", category: "utilities", amount: -79.99, date: "2026-03-01", is_recurring: true },
  { label: "Honda Finance", category: "car", amount: -450, date: "2026-03-01", is_recurring: true },
  { label: "Netflix", category: "subscription", amount: -16.49, date: "2026-03-01", is_recurring: true },
  { label: "Spotify", category: "subscription", amount: -11.99, date: "2026-03-01", is_recurring: true },
  { label: "Apple iCloud", category: "subscription", amount: -3.99, date: "2026-03-01", is_recurring: true },
  { label: "GoodLife Fitness", category: "subscription", amount: -59.99, date: "2026-03-01", is_recurring: true },
  { label: "Uber Eats", category: "dining", amount: -42.30, date: "2026-03-04", is_recurring: false },
  { label: "Tim Hortons", category: "dining", amount: -8.45, date: "2026-03-05", is_recurring: false },
  { label: "The Keg", category: "dining", amount: -128.60, date: "2026-02-28", is_recurring: false },
  { label: "TFSA Contribution", category: "investment", amount: -500, date: "2026-03-01", is_recurring: true },
  { label: "Emergency Fund Transfer", category: "savings", amount: -300, date: "2026-03-01", is_recurring: true },
  { label: "Shell Gas", category: "transport", amount: -68.40, date: "2026-03-02", is_recurring: false },
  { label: "Intact Insurance", category: "insurance", amount: -185, date: "2026-03-01", is_recurring: true },
  // Anomaly: unusually large restaurant bill
  { label: "Alo Restaurant", category: "dining", amount: -387.50, date: "2026-02-14", is_recurring: false },
  // Anomaly: duplicate subscription
  { label: "Netflix", category: "subscription", amount: -16.49, date: "2026-02-15", is_recurring: true },
  { label: "Petro Canada", category: "transport", amount: -72.15, date: "2026-02-20", is_recurring: false },
  { label: "Shoppers Drug Mart", category: "personal", amount: -34.89, date: "2026-03-03", is_recurring: false },
];

export const demoGoals: Omit<Goal, "id" | "user_id">[] = [
  { label: "Emergency Fund (6 months)", target_amount: 25000, current_amount: 11500, target_date: "2027-06-01" },
  { label: "TFSA Max Contribution", target_amount: 95000, current_amount: 14200, target_date: "2035-01-01" },
  { label: "Pay Off Car", target_amount: 18500, current_amount: 0, target_date: "2029-08-01" },
  { label: "Home Renovation Fund", target_amount: 15000, current_amount: 2300, target_date: "2027-12-01" },
];

export const demoAlerts: Omit<Alert, "id" | "user_id" | "created_at">[] = [
  { type: "warning", severity: "medium", message: "Dining spending is 38% higher than your 3-month average. $387.50 charge at Alo Restaurant on Feb 14 is unusual." },
  { type: "danger", severity: "high", message: "Duplicate Netflix charge detected: $16.49 on Feb 15 may be an error." },
  { type: "info", severity: "low", message: "You're on track to reach your emergency fund goal by June 2027 at current contribution rate." },
  { type: "warning", severity: "medium", message: "Grocery spending trending up 12% month-over-month. Current pace: $650/mo vs $580/mo average." },
  { type: "success", severity: "low", message: "TFSA contribution consistent for 8 consecutive months." },
];

export function getDemoFinancialSummary() {
  const monthlyIncome = 8500;
  const monthlyExpenses = 2200 + 600 + 180 + 450 + 92 + 280 + 500 + 300 + 120 + 185;
  const monthlySurplus = monthlyIncome - monthlyExpenses;
  const totalLiquid = 4850 + 11500;
  const cashBufferDays = Math.floor(totalLiquid / (monthlyExpenses / 30));

  return {
    total_balance: 4850 + 11500 + 14200 - 387000 - 1240 - 18500,
    net_liquid: totalLiquid,
    monthly_income: monthlyIncome,
    monthly_expenses: monthlyExpenses,
    monthly_surplus: monthlySurplus,
    cash_buffer_days: cashBufferDays,
    emergency_fund: 11500,
  };
}
