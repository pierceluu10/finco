# Finco — Google Calendar Integration (Deferred)

## Status

Google Calendar integration is **deferred to a future phase**. This document describes the planned architecture.

## Planned Feature

The app will detect meaningful financial reminder opportunities and suggest adding them to the user's Google Calendar. The user must explicitly approve each event.

### Reminder Types

- Subscription renewal reminders
- Mortgage payment due dates
- Credit card payment due dates
- Monthly financial review reminders
- Agent-detected important dates

### User Flow

1. The deterministic reminder engine detects a triggerable event
2. A suggestion card appears in the UI with event details
3. The user clicks "Add to Calendar" or "Not now"
4. If not yet connected, the user goes through Google OAuth consent
5. The backend creates the event via Google Calendar API
6. Success confirmation is shown

### Architecture

- **Auth0** handles delegated access via a Google Social Connection with `calendar.events` scope
- **Backend** performs Google Calendar API calls (never the client)
- **Recurring reminders** use Google Calendar's recurring event support
- **Events are never created silently** — explicit user approval is required

### Deterministic Trigger Engine (Planned)

File: `src/lib/calendar/reminder-suggestions.ts`

Will detect:
- Recurring subscription renewal dates
- Mortgage payment due dates
- Credit card due dates
- Monthly finance review opportunities

### Required Environment Variables (Future)

```env
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

### Google Calendar API Operations

- `events.insert` — create a single event
- `events.insert` with `recurrence` — create recurring events (RRULE format)
- `events.list` — check for existing Finco-created events (avoid duplicates)

### Auth0 Configuration (Future)

1. Add Google as a Social Connection in the Auth0 dashboard
2. Request extended scopes: `https://www.googleapis.com/auth/calendar.events`
3. Backend retrieves the Google access token via Auth0's Management API
4. Backend makes Calendar API calls on the user's behalf
