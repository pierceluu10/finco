export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string | null;
  age_range: string | null;
  province: string | null;
  currency: string;
  net_monthly_income: number | null;
  pay_frequency: string | null;
  income_stability: string | null;
  housing_status: string | null;
  monthly_housing_cost: number | null;
  monthly_debt_payments: number | null;
  monthly_recurring_bills: number | null;
  monthly_subscriptions: number | null;
  emergency_fund_target_months: number;
  investing_goal: string | null;
  risk_comfort: string | null;
  preferred_account_types: string[];
  contribution_priority_order: string[];
  employment_type: string | null;
  household_setup: string | null;
  known_upcoming_large_expenses: string | null;
  current_investment_experience: string | null;
  created_at: string;
  updated_at: string;
}

export type UserProfileInput = Omit<UserProfile, "id" | "user_id" | "created_at" | "updated_at">;

export const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;

export const PROVINCES = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
] as const;

export const PAY_FREQUENCIES = ["weekly", "biweekly", "semi-monthly", "monthly"] as const;

export const INCOME_STABILITIES = ["stable", "variable", "seasonal"] as const;

export const HOUSING_STATUSES = ["rent", "own", "mortgage", "living-with-family", "other"] as const;

export const RISK_COMFORTS = ["low", "moderate", "high"] as const;

export const EMPLOYMENT_TYPES = ["full-time", "part-time", "self-employed", "contract", "retired", "student"] as const;

export const HOUSEHOLD_SETUPS = ["single", "couple", "family"] as const;

export const INVESTMENT_EXPERIENCES = ["none", "beginner", "intermediate", "advanced"] as const;

export const ACCOUNT_TYPE_OPTIONS = ["TFSA", "RRSP", "FHSA", "RESP", "Non-registered"] as const;

export const CONTRIBUTION_PRIORITIES = ["TFSA", "RRSP", "FHSA", "Emergency fund", "Debt payoff", "Non-registered investing"] as const;
