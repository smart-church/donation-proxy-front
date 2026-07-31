# Test Credentials — Evman (mock, frontend-only)

All authentication is simulated in `/app/frontend/src/mock/api.js` and
persisted in browser `localStorage` under key `evman.mock.v1`.

| Role       | Email                | Password    | Notes                    |
|------------|----------------------|-------------|--------------------------|
| Superuser  | admin@evman.io       | admin1234   | Cannot be removed from Admins |
| Manager    | manager@evman.io     | manager1234 | Regular organizer        |

Public form URL pattern: `/form/{eventId}` — no auth required.

If test data becomes stale, clear `localStorage.evman.mock.v1` to reseed.
