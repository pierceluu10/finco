# Finco — Planner Agent

## Overview

The Planner is Finco's future-planning agent. It helps users plan for financial goals by combining their profile data, graph summary, deterministic readiness checks, and a curated ETF dataset.

The Planner is **not just an ETF bot**. ETF suggestions are one sub-feature inside broader financial planning.

## What the Planner Covers

- First home savings (FHSA planning)
- Emergency fund targets and timelines
- Debt payoff sequencing
- TFSA / RRSP / FHSA contribution planning
- Major purchase planning
- Milestone forecasting
- Investment readiness assessment
- Curated ETF suggestions when appropriate

## How It Works

### Data Sources

1. **User Profile** (from Supabase `user_profiles`): income, housing, debts, risk comfort, goals, account preferences
2. **Graph Summary**: computed from the user's financial graph (income, obligations, savings, runway, DTI)
3. **Readiness Engine** (`src/lib/planner/readiness.ts`): deterministic check for investment readiness
4. **Timeline Engine** (`src/lib/planner/timelines.ts`): months-to-goal estimates
5. **ETF Catalog** (`src/data/etfs/canadian-etfs.json`): ~15 curated Canadian ETFs

### Readiness Logic

The readiness engine checks:
- Is monthly cashflow positive?
- Is debt-to-income ratio below 40%?
- Is emergency runway at least 3 months?
- Is income detected in the graph?
- Has the user met their emergency fund target?

If any check fails, the Planner tells the user what to focus on before investing.

### Timeline Logic

The timeline engine estimates months to reach:
- Emergency fund target (50% of monthly surplus)
- First home down payment (30% of monthly surplus)
- Custom goal amounts

### ETF Dataset

Located at `src/data/etfs/canadian-etfs.json` with ~15 curated Canadian-friendly ETFs.

Each ETF includes:
- ticker, name, provider, category
- asset mix, geographic exposure
- risk level, MER fee
- account suitability (TFSA, RRSP, FHSA, etc.)
- distribution and diversification style
- description, suitable_for, avoid_if, notes

Helpers in `src/lib/etf/etf-catalog.ts`:
- `getAllEtfs()` — return full catalog
- `getEtfByTicker(ticker)` — lookup by ticker
- `filterEtfsByRisk(level)` — filter by risk level
- `filterEtfsByAccountType(type)` — filter by account suitability
- `rankEtfsForProfile(profile, readiness)` — rank ETFs based on user profile and readiness

### Important Constraints

- ETF recommendations come **only** from the curated dataset
- The Planner never invents tickers or scrapes external sources
- If the user is not ready to invest, the Planner prioritizes debt/savings advice
- No tax advice, legal advice, or guaranteed return projections
- Missing profile data prompts the user to complete their profile

## API

**Route:** `POST /api/ai/planner`

**Request body:**
```json
{
  "nodes": [...],
  "flows": [...],
  "message": "Am I ready to start investing?"
}
```

**Response:**
```json
{
  "reply": "Based on your current financial state...",
  "readiness": {
    "isReady": false,
    "primaryConstraint": "Emergency runway is only 2 months",
    "secondaryConstraints": [],
    "readinessSummary": "One issue to address...",
    "riskLevel": "moderate"
  }
}
```

## File Map

| File | Responsibility |
|---|---|
| `src/lib/planner/readiness.ts` | Investment readiness engine |
| `src/lib/planner/timelines.ts` | Goal timeline estimation |
| `src/lib/etf/etf-catalog.ts` | ETF catalog helpers |
| `src/data/etfs/canadian-etfs.json` | Curated ETF dataset |
| `src/types/etf.ts` | ETF TypeScript interface |
| `src/app/api/ai/planner/route.ts` | Planner API route |
