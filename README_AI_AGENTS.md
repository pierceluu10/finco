# Finco — AI Agents Architecture

## Overview

Finco has three AI agents backed by Backboard.io (with Gemini fallback):

1. **Sentinel** — primary financial supervisor, graph explainer, alert writer, anomaly detector
2. **Simulator** — explains deterministic before/after graph changes
3. **Planner** — future-planning agent for goals, readiness, timelines, and curated ETFs

The Librarian has been **merged into the Sentinel**. The Sentinel now handles both graph explanation and alert writing.

All agents follow a strict separation: **deterministic engines handle math, AI agents handle language.**

## Agent Details

### 1. Finco Sentinel (Primary Agent)

**Purpose:** Personal financial supervisor. Replaces the former Librarian.

**Roles:**
- Graph-aware explainer (answers questions about nodes, flows, structure)
- Alert writer (translates triggered rules into clear alerts)
- Suspicious activity detector (flags anomalies found by the deterministic engine)
- Structural pressure-point guide (identifies areas of financial strain)

**Constraints:**
- Must always use the full graph state and calculated metrics
- Graph-grounded only — no generic advice
- Never invents anomalies or fabricates values
- Maximum 4 sentences unless the user asks for more
- Memory enabled (remembers across conversations)
- Web search enabled (for Canadian financial program info)

**Delegation:** If the user asks about future planning, ETFs, or goal timelines, Sentinel suggests they speak to the Planner.

**Route:** `POST /api/ai/sentinel` and `POST /api/ai/agent` with `agent: "sentinel"`

### 2. Finco Simulator

**Purpose:** Explain what changed after a deterministic recalculation.

**Constraints:**
- Only called AFTER the simulation engine has finished
- Never performs math itself — only explains results
- Not conversational — one response per simulation
- Memory disabled
- Output validated: must follow 4-line structure (what changed, what was affected, observation, next step)

**Route:** `POST /api/ai/simulator`

### 3. Finco Planner

**Purpose:** Future-planning agent for financial goals.

**Scope:**
- First home savings (FHSA)
- Emergency fund planning
- Debt payoff sequencing
- TFSA / RRSP / FHSA contribution planning
- Major purchase planning
- Investment readiness assessment
- Curated ETF suggestions (from internal dataset only)

**Constraints:**
- Grounded in user profile, graph summary, and deterministic readiness checks
- ETF recommendations come from `src/data/etfs/canadian-etfs.json` only
- If readiness checks show user is not ready to invest, says so clearly
- No tax advice, legal advice, or guaranteed return projections
- Memory enabled
- Web search enabled (for general Canadian financial program info)

**Delegation:** If the user asks about current graph structure or alerts, Planner suggests they ask the Sentinel.

**Route:** `POST /api/ai/planner` and `POST /api/ai/agent` with `agent: "planner"`

## Tool Calling

### Sentinel Tools

| Tool | Returns |
|---|---|
| `get_full_graph_state` | All nodes, flows, and aggregate totals |
| `get_node_detail` | Specific node with inbound/outbound flows |
| `get_dashboard_summary` | Income, obligations, savings, runway, debt ratio |

### Planner Tools

| Tool | Returns |
|---|---|
| `get_readiness_check` | Investment readiness result from deterministic engine |
| `get_etf_recommendations` | Curated ETFs filtered by risk and account type |
| `get_timeline_estimate` | Months-to-goal estimates |
| `get_dashboard_summary` | Income, obligations, savings, runway, debt ratio |

## Sentinel Rules Engine

Rules checked in `src/lib/rules/sentinel-rules.ts`:

| Rule ID | Condition |
|---|---|
| `low_runway` | savings / monthly obligations < 3 months |
| `idle_cash` | buffer node with > $500 and zero outbound edges |
| `high_debt_ratio` | monthly debt / monthly income > 50% |
| `no_investments` | zero investment nodes in graph |
| `negative_cashflow` | income - obligations < 0 |
| `suspicious_duplicates` | multiple expense nodes with identical monthly amounts |
| `idle_cash_large` | account/savings node with > $10,000 and no investment flows |

## Route Responsibilities

| Route | Auth | Thread | Context | Memory |
|---|---|---|---|---|
| `/api/ai/agent` | Session check | Per-user per-agent | Graph state from request | Per agent |
| `/api/ai/sentinel` | Session check | Sentinel thread | Graph + metrics + rules + selected node | Auto |
| `/api/ai/simulator` | Session check | Simulator thread | Before/after from request | Off |
| `/api/ai/planner` | Session check | Planner thread | Profile + graph + readiness | Auto |

## Graceful Degradation

```
Request → Is BACKBOARD_API_KEY set?
  ├─ Yes → Try Backboard
  │    ├─ Success → Return Backboard response
  │    └─ Error → Fall back to Gemini
  └─ No → Use Gemini directly
```

## File Map

| File | Responsibility |
|---|---|
| `src/lib/backboard/client.ts` | HTTP client for Backboard REST API (incl. streaming) |
| `src/lib/backboard/assistants.ts` | Agent configs, system prompts, get-or-create |
| `src/lib/backboard/threads.ts` | Thread persistence, user resolution |
| `src/lib/backboard/tools.ts` | Tool definitions and deterministic handlers |
| `src/lib/backboard/formatters.ts` | Message formatters per agent spec |
| `src/lib/backboard/validators.ts` | Output validation (Simulator 4-line check) |
| `src/lib/rules/sentinel-rules.ts` | Deterministic rules engine (7 rules) |
| `src/lib/planner/readiness.ts` | Investment readiness engine |
| `src/lib/planner/timelines.ts` | Goal timeline estimation engine |
| `src/lib/etf/etf-catalog.ts` | Curated ETF catalog with filtering/ranking |
| `src/lib/gemini.ts` | Gemini fallback implementations |
| `src/app/api/ai/agent/route.ts` | Unified agent route |
| `src/app/api/ai/sentinel/route.ts` | Dedicated Sentinel route |
| `src/app/api/ai/simulator/route.ts` | Dedicated Simulator route |
| `src/app/api/ai/planner/route.ts` | Dedicated Planner route |

## Testing Agents Locally

### Prerequisites
- Auth0 configured (or skip for demo mode)
- Supabase running with `user_agent_threads` table
- `BACKBOARD_API_KEY` in `.env.local`

### Test the Sentinel

```bash
curl -X POST http://localhost:3000/api/ai/sentinel \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id":"1","type":"income","label":"Salary","currentValue":0,"monthlyFlow":5000,"metadata":{}},
      {"id":"2","type":"debt","label":"Mortgage","currentValue":300000,"monthlyFlow":3000,"metadata":{}},
      {"id":"3","type":"savings","label":"Emergency","currentValue":2000,"monthlyFlow":200,"metadata":{}}
    ],
    "flows": [
      {"id":"f1","source":"1","target":"2","amount":3000,"frequency":"monthly"}
    ],
    "message": "What should I pay attention to?"
  }'
```

### Test the Simulator

```bash
curl -X POST http://localhost:3000/api/ai/simulator \
  -H "Content-Type: application/json" \
  -d '{
    "beforeNodes": [{"id":"1","type":"income","label":"Salary","amount":8500}],
    "afterNodes": [{"id":"1","type":"income","label":"Salary","amount":7000}],
    "beforeTotals": {"income":8500,"obligations":5000,"remainingCash":3500},
    "afterTotals": {"income":7000,"obligations":5000,"remainingCash":2000},
    "changedNode": {"label":"Salary","oldValue":8500,"newValue":7000}
  }'
```

### Test the Planner

```bash
curl -X POST http://localhost:3000/api/ai/planner \
  -H "Content-Type: application/json" \
  -d '{
    "nodes": [
      {"id":"1","type":"income","label":"Salary","currentValue":0,"monthlyFlow":5000,"metadata":{}},
      {"id":"2","type":"savings","label":"Emergency","currentValue":8000,"monthlyFlow":500,"metadata":{}}
    ],
    "flows": [],
    "message": "Am I ready to start investing?"
  }'
```
