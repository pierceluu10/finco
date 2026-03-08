# Finco — Auth0 Setup

Finco uses [Auth0](https://auth0.com) with the `@auth0/nextjs-auth0` v4 SDK for identity management and Universal Login.

## Required Environment Variables

Add these to `.env.local`:

```
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_SECRET=<64-char hex string>
APP_BASE_URL=http://localhost:3000
```

Generate `AUTH0_SECRET`:

```bash
openssl rand -hex 32
```

## Auth0 Dashboard Setup (Local Dev)

1. Create a **Regular Web Application** in the Auth0 dashboard.
2. On the Settings tab, set:
   - **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:3000`
   - **Allowed Web Origins**: `http://localhost:3000`
3. Copy the Domain, Client ID, and Client Secret into `.env.local`.

## How It Works

- **Middleware** (`src/middleware.ts`): Auth0 middleware runs on all matched routes. When Auth0 env vars are missing, it passes through (dev bypass).
- **Auto-mounted routes**: The SDK middleware automatically provides `/auth/login`, `/auth/logout`, `/auth/callback`, `/auth/profile`.
- **Universal Login**: Users are redirected to Auth0's hosted login page — no embedded credential forms.
- **Route protection**: The `(app)/layout.tsx` server component calls `auth0.getSession()`. If no session exists and Auth0 is configured, the user is redirected to `/login`.
- **Login/Signup pages**: Both redirect to Auth0 Universal Login (`/auth/login`).

## Protected vs Public Routes

| Route | Access |
|-------|--------|
| `/` (landing) | Public |
| `/login`, `/signup` | Public (redirect to Auth0) |
| `/ecosystem` | Protected |
| `/profile` | Protected |
| `/onboarding` | Protected |
| `/api/*` | API routes resolve auth internally |

## Production Notes

- Use a **Production** Auth0 application (not dev keys).
- Set `APP_BASE_URL` to your production domain.
- Update Allowed Callback/Logout/Web Origins URLs to match the production domain.
- `AUTH0_SECRET` must be the same across all instances behind a load balancer.

## Google Calendar Integration (Future)

When Google Calendar is enabled, Auth0 will handle delegated access via a Google Social Connection with extended scopes (`calendar.events`). The backend retrieves the Google access token via Auth0 and makes Calendar API calls on the user's behalf. The user must explicitly approve each calendar event creation.
