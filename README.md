# Finco

AI-powered financial cartography platform for Canadians.
Visualize money flow as an interactive graph, monitor risks with specialized agents, simulate changes, and plan future goals.

---

## What it does

- maps a user's entire financial system as a draggable node-and-edge graph
- nodes represent financial entities (income, accounts, expenses, debt, savings, investments)
- edges represent directional money flow between nodes
- three AI agents analyze, explain, and advise based on the graph and user profile
- deterministic engines handle all math (no LLM math)
- supports CSV import to auto-generate nodes from bank transactions
- user profile drives planning, readiness checks, and agent recommendations

## AI agents

- **Sentinel** -- primary supervisor, graph explainer, anomaly detector, alert writer, pressure-point guide
- **Simulator** -- explains before/after impact of simulated changes in structured short-form output
- **Planner** -- future planning agent for emergency fund, TFSA/RRSP/FHSA, debt payoff, investment readiness, curated ETF suggestions

Librarian was merged into Sentinel. Agents delegate to each other when appropriate.

## Tech stack

- **Frontend** -- Next.js 14 (App Router), TypeScript, React, Tailwind CSS, Radix UI
- **Graph** -- custom canvas renderer with d3-force layout, live physics, pan/zoom
- **Auth** -- Auth0 (Universal Login, v4 SDK)
- **Database** -- Supabase (PostgreSQL)
- **AI runtime** -- Backboard.io (assistants, threads, memory, tools), Gemini API (fallback)
- **Deployment** -- Vercel

## Project structure

```
src/
  app/
    (app)/ecosystem/     -- main graph dashboard
    (app)/profile/       -- financial profile form
    (app)/onboarding/    -- onboarding flow
    (auth)/login/        -- redirects to Auth0 login
    (auth)/signup/       -- redirects to Auth0 signup
    api/ai/sentinel/     -- sentinel agent route
    api/ai/simulator/    -- simulator agent route
    api/ai/planner/      -- planner agent route
    api/ai/agent/        -- generic agent dispatcher
    api/profile/         -- profile CRUD
    api/parse-csv/       -- CSV parsing and categorization
  components/
    graph/               -- graph renderer, nodes, edges, legend
    panels/              -- node popup, edge detail, add/edit/delete dialogs, agent chat, simulation overlay, CSV upload
    shared/              -- sidebar, logo, page transition
    landing/             -- landing page (hero, navbar)
  lib/
    auth0.ts             -- Auth0 client setup
    supabase.ts          -- Supabase client setup
    gemini.ts            -- Gemini API calls (fallback for all agents)
    graph-theme.ts       -- node/edge color palette
    graph-transforms.ts  -- domain data to graph data conversion
    demo-data.ts         -- seed data for first load
    csv-import.ts        -- CSV parsing utilities
    simulation-ripple.ts -- deterministic simulation ripple logic
    backboard/           -- Backboard client, assistants, threads, formatters, tools, validators
    rules/               -- Sentinel deterministic rules engine
    planner/             -- readiness checks, timeline estimators
    etf/                 -- curated ETF catalog and filters
  types/
    graph.ts             -- node, flow, edge types
    profile.ts           -- user profile type and enums
    etf.ts               -- ETF type
  data/
    etfs/                -- curated Canadian ETF dataset (JSON)
supabase/
  schema.sql             -- full database schema
```

## Routes

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | public | landing page |
| `/login` | public | redirects to Auth0 |
| `/signup` | public | redirects to Auth0 (signup hint) |
| `/ecosystem` | protected | graph dashboard |
| `/profile` | protected | financial profile |
| `/onboarding` | protected | first-time setup |

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
# Auth0
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_SECRET=<run: openssl rand -hex 32>
APP_BASE_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Gemini
GEMINI_API_KEY=...

# Backboard
BACKBOARD_API_KEY=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Auth0 dashboard setup

- create a Regular Web Application
- Allowed Callback URLs: `http://localhost:3000/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`
- Allowed Web Origins: `http://localhost:3000`
- for production, replace `localhost:3000` with your deployment URL in both env vars and Auth0 dashboard

## Supabase setup

- create a project
- run `supabase/schema.sql` in the SQL editor to create all tables
- copy project URL, anon key, and service role key into env vars

## Backboard setup

- create three assistants: `finco-sentinel`, `finco-simulator`, `finco-planner`
- the app auto-creates them on first use if they don't exist
- see `BACKBOARD_SETUP.md` for details

## Local development

```
npm install
npm run dev
```

- app runs at `http://localhost:3000`
- Auth0 env vars are optional for local dev (middleware bypasses auth if not configured)
- without Supabase, the app uses in-memory demo data

## Production deployment (Vercel)

- push to GitHub, connect repo in Vercel
- set all env vars in Vercel project settings
- `APP_BASE_URL` must match the Vercel deployment URL exactly
- update Auth0 dashboard callback/logout/origins URLs to match

## Database tables

- `users` -- auth0 user mapping
- `accounts` -- bank accounts
- `transactions` -- transaction records
- `financial_nodes` -- graph nodes (income, expense, debt, savings, investment)
- `financial_edges` -- graph edges (money flows)
- `goals` -- savings/investment goals
- `alerts` -- agent-generated alerts
- `simulations` -- saved simulation runs
- `user_profiles` -- financial profile data (drives agents and planning)
- `user_agent_threads` -- Backboard thread-per-user-per-agent mapping

## Key design decisions

- all financial math is deterministic (rules engines, readiness checks, timeline estimators) -- never delegated to LLMs
- agents receive pre-computed structured data, not raw numbers to calculate
- graph state is the source of truth for financial structure
- Supabase is the source of truth for profile and persistent data
- Backboard handles conversational memory and tool orchestration
- ETF recommendations come only from the curated internal dataset, not web scraping
- node colors use a centralized blue-hue palette defined in `graph-theme.ts`
- edges are strictly straight lines
- graph has live d3-force physics (nodes react to each other on drag)
