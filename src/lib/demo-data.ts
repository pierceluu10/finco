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

// ---------------------------------------------------------------------------
// Demo graph — distributed multi-cluster financial ecosystem
// ---------------------------------------------------------------------------

export const demoNodes: (Omit<FinancialNode, "id" | "user_id"> & { _id: string })[] = [
  // Income sources
  { _id: "salary", label: "Salary", type: "income", current_value: 0, monthly_weight: 8500, metadata_json: { employer: "TechCorp Canada", frequency: "biweekly" } },
  { _id: "side-income", label: "Side Income", type: "income", current_value: 0, monthly_weight: 1200, metadata_json: { source: "freelance consulting" } },
  { _id: "dividends", label: "Dividends", type: "income", current_value: 0, monthly_weight: 180, metadata_json: { source: "ETF distributions" } },

  // Accounts (hubs — but distributed, not one central node)
  { _id: "chequing", label: "Chequing", type: "account", current_value: 4850, monthly_weight: 0, metadata_json: { institution: "TD Bank" } },
  { _id: "joint-account", label: "Joint Account", type: "account", current_value: 2400, monthly_weight: 0, metadata_json: { institution: "TD Bank", shared: true } },
  { _id: "savings-account", label: "Savings Account", type: "account", current_value: 11500, monthly_weight: 0, metadata_json: { institution: "TD Bank" } },
  { _id: "credit-card", label: "Credit Card", type: "account", current_value: -1240, monthly_weight: 0, metadata_json: { institution: "TD Visa", limit: 8000 } },

  // Housing cluster
  { _id: "mortgage", label: "Mortgage", type: "debt", current_value: 387000, monthly_weight: 2200, metadata_json: { rate: 5.14, remaining_years: 22 } },
  { _id: "property-tax", label: "Property Tax", type: "expense", current_value: 0, monthly_weight: 340, metadata_json: { annual: 4080 } },
  { _id: "home-insurance", label: "Home Insurance", type: "expense", current_value: 0, monthly_weight: 95, metadata_json: { provider: "Intact" } },
  { _id: "home-maintenance", label: "Home Maintenance", type: "expense", current_value: 0, monthly_weight: 150, metadata_json: {} },

  // Daily living cluster
  { _id: "groceries", label: "Groceries", type: "expense", current_value: 0, monthly_weight: 600, metadata_json: { category: "food" } },
  { _id: "dining", label: "Dining & Takeout", type: "expense", current_value: 0, monthly_weight: 280, metadata_json: {} },
  { _id: "coffee", label: "Coffee", type: "expense", current_value: 0, monthly_weight: 65, metadata_json: { avg_per_visit: 5.5 } },

  // Bills & recurring cluster
  { _id: "utilities", label: "Utilities", type: "expense", current_value: 0, monthly_weight: 180, metadata_json: {} },
  { _id: "hydro", label: "Hydro", type: "expense", current_value: 0, monthly_weight: 85, metadata_json: {} },
  { _id: "internet", label: "Internet", type: "expense", current_value: 0, monthly_weight: 80, metadata_json: { provider: "Rogers" } },
  { _id: "phone", label: "Phone Plan", type: "expense", current_value: 0, monthly_weight: 55, metadata_json: { provider: "Fido" } },
  { _id: "subscriptions", label: "Subscriptions", type: "expense", current_value: 0, monthly_weight: 92, metadata_json: { services: ["Netflix", "Spotify", "iCloud", "Gym"] } },

  // Transportation cluster
  { _id: "car-payment", label: "Car Payment", type: "debt", current_value: 18500, monthly_weight: 450, metadata_json: { rate: 4.99, remaining_months: 41 } },
  { _id: "gas", label: "Gas", type: "expense", current_value: 0, monthly_weight: 140, metadata_json: {} },
  { _id: "auto-insurance", label: "Auto Insurance", type: "expense", current_value: 0, monthly_weight: 135, metadata_json: { provider: "Intact" } },
  { _id: "parking", label: "Parking", type: "expense", current_value: 0, monthly_weight: 60, metadata_json: {} },

  // Savings cluster
  { _id: "emergency", label: "Emergency Fund", type: "savings", current_value: 11500, monthly_weight: 300, metadata_json: { target: 25000 } },
  { _id: "vacation-fund", label: "Vacation Fund", type: "savings", current_value: 3200, monthly_weight: 200, metadata_json: { target: 6000 } },
  { _id: "renovation-fund", label: "Renovation Fund", type: "savings", current_value: 2300, monthly_weight: 150, metadata_json: { target: 15000 } },

  // Investment cluster
  { _id: "tfsa", label: "TFSA", type: "investment", current_value: 14200, monthly_weight: 500, metadata_json: { institution: "Wealthsimple", contribution_room: 6500 } },
  { _id: "rrsp", label: "RRSP", type: "investment", current_value: 22000, monthly_weight: 400, metadata_json: { institution: "Wealthsimple" } },
  { _id: "etf-portfolio", label: "ETF Portfolio", type: "investment", current_value: 8500, monthly_weight: 0, metadata_json: { holdings: ["XEQT", "VFV", "ZAG"] } },

  // Insurance cluster
  { _id: "life-insurance", label: "Life Insurance", type: "expense", current_value: 0, monthly_weight: 45, metadata_json: { provider: "Sun Life" } },
];

export const demoEdges: { source: string; target: string; amount: number; frequency: "monthly" | "biweekly" }[] = [
  // Income → accounts
  { source: "salary", target: "chequing", amount: 7000, frequency: "monthly" },
  { source: "salary", target: "joint-account", amount: 1500, frequency: "monthly" },
  { source: "side-income", target: "savings-account", amount: 1200, frequency: "monthly" },
  { source: "dividends", target: "tfsa", amount: 180, frequency: "monthly" },

  // Chequing → expenses
  { source: "chequing", target: "groceries", amount: 600, frequency: "monthly" },
  { source: "chequing", target: "dining", amount: 280, frequency: "monthly" },
  { source: "chequing", target: "subscriptions", amount: 92, frequency: "monthly" },
  { source: "chequing", target: "car-payment", amount: 450, frequency: "monthly" },
  { source: "chequing", target: "gas", amount: 140, frequency: "monthly" },
  { source: "chequing", target: "phone", amount: 55, frequency: "monthly" },
  { source: "chequing", target: "credit-card", amount: 400, frequency: "monthly" },

  // Joint account → housing cluster
  { source: "joint-account", target: "mortgage", amount: 2200, frequency: "monthly" },
  { source: "joint-account", target: "property-tax", amount: 340, frequency: "monthly" },
  { source: "joint-account", target: "home-insurance", amount: 95, frequency: "monthly" },
  { source: "joint-account", target: "home-maintenance", amount: 150, frequency: "monthly" },
  { source: "joint-account", target: "utilities", amount: 180, frequency: "monthly" },

  // Utilities → sub-expenses
  { source: "utilities", target: "hydro", amount: 85, frequency: "monthly" },
  { source: "utilities", target: "internet", amount: 80, frequency: "monthly" },

  // Credit card → small daily expenses
  { source: "credit-card", target: "coffee", amount: 65, frequency: "monthly" },
  { source: "credit-card", target: "parking", amount: 60, frequency: "monthly" },

  // Chequing → savings
  { source: "chequing", target: "savings-account", amount: 650, frequency: "monthly" },

  // Savings account → savings buckets
  { source: "savings-account", target: "emergency", amount: 300, frequency: "monthly" },
  { source: "savings-account", target: "vacation-fund", amount: 200, frequency: "monthly" },
  { source: "savings-account", target: "renovation-fund", amount: 150, frequency: "monthly" },

  // Chequing → investments
  { source: "chequing", target: "tfsa", amount: 500, frequency: "monthly" },
  { source: "chequing", target: "rrsp", amount: 400, frequency: "monthly" },

  // Investment → sub-holdings
  { source: "tfsa", target: "etf-portfolio", amount: 500, frequency: "monthly" },

  // Insurance (from chequing)
  { source: "chequing", target: "auto-insurance", amount: 135, frequency: "monthly" },
  { source: "chequing", target: "life-insurance", amount: 45, frequency: "monthly" },
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
  { label: "Alo Restaurant", category: "dining", amount: -387.50, date: "2026-02-14", is_recurring: false },
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
  const monthlyIncome = 8500 + 1200 + 180;
  const monthlyExpenses = 2200 + 340 + 95 + 150 + 600 + 280 + 65 + 180 + 92 + 450 + 140 + 135 + 60 + 55 + 45;
  const monthlySavings = 300 + 200 + 150;
  const monthlyInvestments = 500 + 400;
  const monthlySurplus = monthlyIncome - monthlyExpenses - monthlySavings - monthlyInvestments;
  const totalLiquid = 4850 + 2400 + 11500;

  return {
    total_balance: totalLiquid + 14200 + 22000 + 8500 - 387000 - 1240 - 18500,
    net_liquid: totalLiquid,
    monthly_income: monthlyIncome,
    monthly_expenses: monthlyExpenses,
    monthly_surplus: monthlySurplus,
    cash_buffer_days: Math.floor(totalLiquid / (monthlyExpenses / 30)),
    emergency_fund: 11500,
  };
}
