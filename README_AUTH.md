# Finco — Auth0 Setup Guide

## Overview

Finco uses **Auth0** (Regular Web Application type) for authentication via the
`@auth0/nextjs-auth0` v4 SDK. Authentication uses **Auth0 Universal Login** —
no embedded credential forms.

## Environment Variables

Add these to `.env.local`:

```env
AUTH0_DOMAIN=dev-4gztmpj5i0lx00gq.us.auth0.com
AUTH0_CLIENT_ID=<your Auth0 client ID>
AUTH0_CLIENT_SECRET=<your Auth0 client secret>
AUTH0_SECRET=<a random 32-byte hex string for session encryption>
APP_BASE_URL=http://localhost:3000
```

### Generating AUTH0_SECRET

```bash
openssl rand -hex 32
```

### Important

- **AUTH0_DOMAIN** must include `.com` (e.g. `dev-xxx.us.auth0.com`).
- **APP_BASE_URL** replaces any older `AUTH0_BASE_URL` variable.
- Do **not** use `AUTH0_ISSUER_BASE_URL` — it is not needed with the v4 SDK.
- Never expose `AUTH0_CLIENT_SECRET` or `AUTH0_SECRET` to the client.

## Auth0 Dashboard Configuration

Log into [Auth0 Dashboard](https://manage.auth0.com/) and navigate to your
application settings.

### For local development

| Setting | Value |
|---|---|
| **Application Type** | Regular Web Application |
| **Allowed Callback URLs** | `http://localhost:3000/auth/callback` |
| **Allowed Logout URLs** | `http://localhost:3000` |
| **Allowed Web Origins** | `http://localhost:3000` |

### For production

Replace `http://localhost:3000` with your production URL in all three fields.

## Auth Flow

1. `/login` — redirects to Auth0 Universal Login with `returnTo=/ecosystem`
2. `/signup` — redirects to Auth0 Universal Login with `screen_hint=signup`
3. `/auth/callback` — handled automatically by the SDK middleware
4. `/auth/logout` — handled automatically by the SDK middleware

## Route Protection

### Protected routes (require authentication)

- `/ecosystem`
- `/dashboard`
- All routes under `(app)/` layout group

Protection is enforced in `src/app/(app)/layout.tsx` via `auth0.getSession()`.
If no session exists, the user is redirected to `/login`.

### Public routes

- `/` — landing page
- `/login` — redirect entry point
- `/signup` — redirect entry point

### API route protection

All `/api/ai/*` routes attempt to resolve the authenticated user. If Auth0
is not configured (no `AUTH0_CLIENT_ID` env var), they fall back to a demo
user ID for local development.

## SDK Architecture

- **`src/lib/auth0.ts`** — creates the Auth0Client singleton
- **`src/middleware.ts`** — runs `auth0.middleware()` on all non-static routes
  to handle `/auth/*` routes and session cookies
- **`src/app/(app)/layout.tsx`** — checks session for protected routes
- **`src/app/(auth)/login/page.tsx`** — redirects to `/auth/login`
- **`src/app/(auth)/signup/page.tsx`** — redirects to `/auth/login?screen_hint=signup`
