-- Finco Database Schema

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth0_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('chequing', 'savings', 'credit', 'investment', 'mortgage')),
  current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_recurring BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS financial_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'account', 'expense', 'debt', 'savings', 'investment')),
  current_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  monthly_weight NUMERIC(12, 2) NOT NULL DEFAULT 0,
  metadata_json JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS financial_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES financial_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES financial_nodes(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'biweekly', 'weekly', 'annual', 'one-time')),
  annual_total NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL,
  current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  target_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('warning', 'info', 'danger', 'success')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  related_node_id UUID REFERENCES financial_nodes(id) ON DELETE SET NULL,
  related_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('add_expense', 'modify_income', 'add_savings', 'remove_income')),
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_summary TEXT,
  impact_score NUMERIC(5, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User financial profile (drives graph, planning, and agent context)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT,
  age_range TEXT CHECK (age_range IS NULL OR age_range IN ('18-24', '25-34', '35-44', '45-54', '55-64', '65+')),
  province TEXT,
  currency TEXT NOT NULL DEFAULT 'CAD',
  net_monthly_income NUMERIC(12, 2),
  pay_frequency TEXT CHECK (pay_frequency IS NULL OR pay_frequency IN ('weekly', 'biweekly', 'semi-monthly', 'monthly')),
  income_stability TEXT CHECK (income_stability IS NULL OR income_stability IN ('stable', 'variable', 'seasonal')),
  housing_status TEXT CHECK (housing_status IS NULL OR housing_status IN ('rent', 'own', 'mortgage', 'living-with-family', 'other')),
  monthly_housing_cost NUMERIC(12, 2),
  monthly_debt_payments NUMERIC(12, 2),
  monthly_recurring_bills NUMERIC(12, 2),
  monthly_subscriptions NUMERIC(12, 2),
  emergency_fund_target_months INTEGER NOT NULL DEFAULT 6,
  investing_goal TEXT,
  risk_comfort TEXT CHECK (risk_comfort IS NULL OR risk_comfort IN ('low', 'moderate', 'high')),
  preferred_account_types TEXT[] DEFAULT '{}',
  contribution_priority_order TEXT[] DEFAULT '{}',
  employment_type TEXT CHECK (employment_type IS NULL OR employment_type IN ('full-time', 'part-time', 'self-employed', 'contract', 'retired', 'student')),
  household_setup TEXT CHECK (household_setup IS NULL OR household_setup IN ('single', 'couple', 'family')),
  known_upcoming_large_expenses TEXT,
  current_investment_experience TEXT CHECK (current_investment_experience IS NULL OR current_investment_experience IN ('none', 'beginner', 'intermediate', 'advanced')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backboard agent thread mappings
CREATE TABLE IF NOT EXISTS user_agent_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  assistant_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_financial_nodes_user ON financial_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_edges_user ON financial_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_simulations_user ON simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agent_threads_user ON user_agent_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);
