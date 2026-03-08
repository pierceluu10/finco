# Finco — Backboard Setup Guide

## Overview

Finco uses [Backboard.io](https://backboard.io) as the **persistent AI runtime layer** for three financial agents. Backboard provides:

- Assistants with persistent system prompts
- Per-user threads that survive sessions
- Memory across conversations (Sentinel and Planner)
- Tool-calling bridge to deterministic app logic
- Streaming support for progressive response rendering

**Backboard is NOT the source of truth for financial data.** Supabase holds all structured data. Backboard only handles conversational AI.

## Environment Variable

Add to `.env.local`:

```env
BACKBOARD_API_KEY=<your Backboard API key>
```

Get your API key from [Backboard Dashboard → Settings → API Keys](https://app.backboard.io/).

**This key is server-only. Never expose it to the client.**

## Architecture

### Three Assistants

| Assistant | Backboard Name | Purpose | Memory | Web Search |
|---|---|---|---|---|
| Sentinel | `finco-sentinel` | Graph supervisor, explainer, alert writer, anomaly detector | Auto | Auto |
| Simulator | `finco-simulator` | Explains deterministic before/after changes | Off | Off |
| Planner | `finco-planner` | Future planning, readiness, goals, curated ETFs | Auto | Auto |

### Assistant Creation Strategy

Assistants are created **automatically on first use** via a get-or-create pattern:

1. On the first API call for an agent, the server lists all Backboard assistants via `GET /assistants`
2. If an assistant with the correct name exists, it is reused
3. If not, it is created with the exact system prompt and tool definitions
4. The assistant ID is cached in memory for the server process lifetime

### Thread Persistence Model

Each user gets **one thread per agent** (3 threads total). Thread mappings are stored in Supabase:

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

### Memory Policy

| Agent | Memory | Reason |
|---|---|---|
| Sentinel | `Auto` | Benefits from remembering what the user explored and asked about |
| Simulator | `off` | Stateless explanation of a single change |
| Planner | `Auto` | Benefits from remembering user goals and preferences |

## Streaming

The Backboard client supports streaming via `addMessageStream()`. When `stream: "true"` is sent, Backboard returns an SSE stream that can be piped directly to the client for progressive rendering.

The chat modal detects `text/event-stream` content type and renders chunks progressively instead of waiting for the full response.

## Deterministic vs AI Responsibilities

### Deterministic (app backend)

- Graph state management
- Financial metric calculations
- Sentinel rules engine (7 rules)
- Investment readiness checks
- Goal timeline estimates
- ETF catalog filtering and ranking
- Simulator output validation
- Dashboard summary calculations

### AI (Backboard)

- Graph-grounded Q&A (Sentinel)
- Writing human-readable alerts (Sentinel)
- Explaining simulation results (Simulator)
- Planning advice and ETF context (Planner)

## File Structure

```
src/lib/backboard/
  client.ts       — HTTP client with streaming support
  assistants.ts   — Agent configs, system prompts, get-or-create
  threads.ts      — Thread persistence with Supabase, user resolution
  tools.ts        — Tool definitions and deterministic handlers
  formatters.ts   — Message formatters per agent specification
  validators.ts   — Output validation (Simulator structure check)
```

## Local Development

1. Create a Backboard account at [backboard.io](https://backboard.io)
2. Generate an API key in Settings → API Keys
3. Add `BACKBOARD_API_KEY=<key>` to `.env.local`
4. Start the dev server: `npm run dev`
5. The three assistants will be auto-created on first agent API call
6. Thread mappings persist in Supabase — each user gets one thread per agent
