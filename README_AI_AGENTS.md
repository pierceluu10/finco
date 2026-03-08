# Finco — AI Agents Architecture

## Overview

Finco has three AI agents backed by Backboard.io (with Gemini fallback):

1. **Librarian** — answers questions about the user's financial graph
2. **Simulator** — explains deterministic before/after graph changes
3. **Sentinel** — writes alerts for triggered deterministic rules

All three agents follow a strict separation: **deterministic engines handle
math, AI agents handle language.**

## Agent Details

### 1. Finco Librarian

**Purpose:** Answer questions about the user's financial graph.

**Constraints:**
- Must always use the full graph state
- Graph-grounded only — no generic advice
- Maximum 4 sentences unless the user asks for more
- Memory enabled (remembers across conversations)

**Message format sent to Backboard:**
```
CURRENT GRAPH STATE:
Nodes:

<id> <type> <label> <amount> <currency> <metadata>
(one line per node)

Flows:

<source label> → <target label> <amount> <frequency> flow
(one line per flow)

USER MESSAGE:
<the user's actual message>
```

**Route:** `POST /api/ai/librarian` and `POST /api/ai/agent` with `agent: "librarian"`

### 2. Finco Simulator

**Purpose:** Explain what changed after a deterministic recalculation.

**Constraints:**
- Only called AFTER the simulation engine has finished
- Never performs math itself — only explains results
- Not conversational — one response per simulation
- Memory disabled

**Message format sent to Backboard:**
```
BEFORE STATE:
Nodes:

<id> <type> <label> <amount> <status>
(one per node)

Total income: <value>
Total obligations: <value>
Remaining cash: <value>

AFTER STATE:
Nodes:

<id> <type> <label> <amount> <status>
(one per node, status: healthy / warning / critical)

Total income: <value>
Total obligations: <value>
Remaining cash: <value>

CHANGED NODE:
<node label> changed from <old value> to <new value>
```

**Route:** `POST /api/ai/simulator`

### 3. Finco Sentinel

**Purpose:** Write alerts for already-triggered deterministic rules.

**Constraints:**
- Never detects rules itself — the rules engine does
- Only called when at least one rule is triggered
- One alert per triggered rule, no more, no less
- Memory disabled

**Rules engine checks (in `src/lib/rules/sentinel-rules.ts`):**

| Rule ID | Condition |
|---|---|
| `low_runway` | savings / monthly obligations < 3 months |
| `idle_cash` | buffer node with > $500 and zero outbound edges |
| `high_debt_ratio` | monthly debt / monthly income > 50% |
| `no_investments` | zero investment nodes in graph |
| `negative_cashflow` | income - obligations < 0 |

**Message format sent to Backboard:**
```
CURRENT GRAPH STATE:
Nodes:

<id> <type> <label> <amount> <currency> <metadata>

Flows:

<source> → <target> <amount> <frequency>

Calculated values:

Total monthly income: <value>
Total monthly obligations: <value>
Total savings balance: <value>
Emergency runway: <value> months
Debt to income ratio: <value>

TRIGGERED RULES:

<rule id>: <plain description>
(one per rule)
```

**Route:** `POST /api/ai/sentinel`

## Tool Calling (Librarian only)

The Librarian has access to server-side tools:

| Tool | Returns |
|---|---|
| `get_full_graph_state` | All nodes, flows, and aggregate totals |
| `get_node_detail` | Specific node with inbound/outbound flows |
| `get_dashboard_summary` | Income, obligations, savings, runway, debt ratio |

Tool execution flow:
1. Librarian requests a tool via Backboard
2. Our backend executes it deterministically
3. Results are submitted back to Backboard
4. Librarian continues its response with the data

## Route Responsibilities

| Route | Auth | Backboard Thread | Deterministic Context | Memory |
|---|---|---|---|---|
| `/api/ai/agent` | Session check | Per-user per-agent | Graph state from request | Per agent |
| `/api/ai/librarian` | Session check | Librarian thread | Graph state from request | Auto |
| `/api/ai/simulator` | Session check | Simulator thread | Before/after from request | Off |
| `/api/ai/sentinel` | Session check | Sentinel thread | Rules engine output | Off |

## Graceful Degradation

```
Request → Is BACKBOARD_API_KEY set?
  ├─ Yes → Try Backboard
  │    ├─ Success → Return Backboard response
  │    └─ Error → Fall back to Gemini
  └─ No → Use Gemini directly
```

Both Backboard and Gemini use the same system prompts, so responses are
consistent regardless of which backend is active.

## File Map

| File | Responsibility |
|---|---|
| `src/lib/backboard/client.ts` | HTTP client for Backboard REST API |
| `src/lib/backboard/assistants.ts` | Assistant definitions, exact system prompts |
| `src/lib/backboard/threads.ts` | Thread persistence, user resolution |
| `src/lib/backboard/tools.ts` | Tool definitions and deterministic handlers |
| `src/lib/backboard/formatters.ts` | Message formatters per agent spec |
| `src/lib/rules/sentinel-rules.ts` | Deterministic rules engine (5 rules) |
| `src/lib/gemini.ts` | Gemini fallback implementations |
| `src/app/api/ai/agent/route.ts` | Unified agent route (all three) |
| `src/app/api/ai/librarian/route.ts` | Dedicated Librarian route |
| `src/app/api/ai/simulator/route.ts` | Dedicated Simulator route |
| `src/app/api/ai/sentinel/route.ts` | Dedicated Sentinel route |

## Testing Agents Locally

### Prerequisites
- Auth0 configured (or skip for demo mode)
- Supabase running with `user_agent_threads` table
- `BACKBOARD_API_KEY` in `.env.local`

### Test the Librarian

```bash
curl -X POST http://localhost:3000/api/ai/agent \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "librarian",
    "message": "What is my total monthly income?",
    "graphState": "NODES:\n- id: salary | type: income | label: Salary | amount: 8500"
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
    ]
  }'
```
