# Finco — Backboard Setup Guide

## Overview

Finco uses [Backboard.io](https://backboard.io) as the **persistent AI runtime
layer** for three financial agents. Backboard provides:

- Assistants with persistent system prompts
- Per-user threads that survive sessions
- Memory across conversations (for the Librarian)
- Tool-calling bridge to deterministic app logic

**Backboard is NOT the source of truth for financial data.** Supabase holds all
structured data. Backboard only handles conversational AI.

## Environment Variable

Add to `.env.local`:

```env
BACKBOARD_API_KEY=<your Backboard API key>
```

Get your API key from [Backboard Dashboard → Settings → API Keys](https://app.backboard.io/).

**This key is server-only. Never expose it to the client.**

## Architecture

### Three Assistants

| Assistant | Backboard Name | Purpose | Memory |
|---|---|---|---|
| Librarian | `finco-librarian` | Answers graph-grounded financial questions | Auto |
| Simulator | `finco-simulator` | Explains deterministic before/after changes | Off |
| Sentinel | `finco-sentinel` | Writes alerts for triggered deterministic rules | Off |

### Assistant Creation Strategy

Assistants are created **automatically on first use** via a get-or-create
pattern:

1. On the first API call for an agent, the server lists all Backboard
   assistants via `GET /assistants`
2. If an assistant with the correct name exists, it is reused
3. If not, it is created with the exact system prompt and tool definitions
4. The assistant ID is cached in memory for the server process lifetime

### Thread Persistence Model

Each user gets **one thread per agent** (3 threads total). Thread mappings are
stored in Supabase:

```sql
CREATE TABLE user_agent_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  assistant_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, agent_name)
);
```

On each agent call:
1. Resolve the authenticated user's Supabase UUID
2. Look up `user_agent_threads` for `(user_id, agent_name)`
3. If found, reuse the thread
4. If not, create a new Backboard thread and persist the mapping

### Memory Policy

| Agent | Memory | Reason |
|---|---|---|
| Librarian | `Auto` | Benefits from remembering what the user explored |
| Simulator | `off` | Stateless explanation of a single change |
| Sentinel | `off` | Stateless alert writing for current triggered rules |

## Deterministic vs AI Responsibilities

### Deterministic (our app/backend)

- Graph state management
- Simulation engine (`src/lib/simulation.ts`)
- Forecast engine (`src/lib/forecast.ts`)
- Anomaly detection (`src/lib/anomaly.ts`)
- Sentinel rules engine (`src/lib/rules/sentinel-rules.ts`)
- Dashboard summary calculations
- All financial math

### AI (Backboard)

- Natural language question answering (Librarian)
- Explaining simulation results in plain language (Simulator)
- Writing human-readable alerts from triggered rules (Sentinel)

**The AI never invents financial data. Every response is grounded in
deterministic outputs.**

## Tool Calling

The Librarian assistant has access to these tools:

| Tool | Description |
|---|---|
| `get_full_graph_state` | Returns all nodes, flows, and totals |
| `get_node_detail` | Returns a specific node with connected flows |
| `get_dashboard_summary` | Returns income, obligations, savings, runway, debt ratio |

When the Librarian requests a tool, our backend executes it using
deterministic logic (`src/lib/backboard/tools.ts`) and submits the result
back to Backboard.

## File Structure

```
src/lib/backboard/
  client.ts       — HTTP client for Backboard REST API
  assistants.ts   — Assistant definitions, system prompts, get-or-create
  threads.ts      — Thread persistence with Supabase, user resolution
  tools.ts        — Tool definitions and deterministic handlers
  formatters.ts   — Exact message formatters per agent specification
```

## API Routes

| Route | Agent | Input |
|---|---|---|
| `POST /api/ai/agent` | Any (via `agent` field) | `{ agent, message, graphState?, nodes?, flows? }` |
| `POST /api/ai/librarian` | Librarian | `{ graphState, message }` |
| `POST /api/ai/simulator` | Simulator | `{ beforeNodes, afterNodes, beforeTotals, afterTotals, changedNode }` |
| `POST /api/ai/sentinel` | Sentinel | `{ nodes, flows }` |

## Graceful Degradation

If `BACKBOARD_API_KEY` is not set or the Backboard API returns an error,
all agent routes **fall back to the Gemini implementation** in
`src/lib/gemini.ts`. The app never breaks — it degrades to the previous
Gemini-based agents.

## Local Development

1. Create a Backboard account at [backboard.io](https://backboard.io)
2. Generate an API key in Settings → API Keys
3. Add `BACKBOARD_API_KEY=<key>` to `.env.local`
4. Start the dev server: `npm run dev`
5. The three assistants will be auto-created on first agent API call
