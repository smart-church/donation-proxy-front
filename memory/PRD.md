# Evman — Event Registration System (PRD)

## Original Problem Statement
Full UI for the Russian "Event registration" spec — 12+ pages including Login,
Events list, Create event, Participants list & detail, Form editor (dynamic
anketa builder with autosave), Event settings, Mail (compose / outbox /
templates), Managers, Admins, public Form + success/fail, Profile. Evman
design (dark theme, green #00A86B, Manrope). Rich text via Quill. Column
filters + xlsx export on participants. Modal confirmations. Date formatting
in Russian with relative time.

## User Choices (2026-01-05)
- Scope: **Frontend only** + mock everything in **localStorage**
- Stack: **React (JavaScript, CRA)** — no TypeScript
- Auth: Login + seed admin only (no registration)
- Rich Text Editor: **Quill** (react-quill)
- Email integration: **deferred / mocked** — sends persist to outbox but no SMTP

## Architecture
- **Frontend**: React 18, react-router-dom v6, TailwindCSS with CSS-variables
  for light/dark theme, Quill for rich text, xlsx for exports,
  lucide-react icons, Manrope font from Google Fonts.
- **Backend**: minimal FastAPI (`/api/health`) to satisfy supervisor;
  application data lives entirely in browser `localStorage` under key
  `evman.mock.v1`.
- **Mock API** (`/app/frontend/src/mock/api.js`) exposes async functions with
  simulated latency (~220 ms) that read/write via `store.js`.
- All URL routing configured; the layout auto-detects the active event from
  the pathname (`/events/:id/...` or `/participant/:pid?event=...`).

## Personas
1. **Superuser (u_admin)** — created by seed, manages events & admins.
2. **Manager (u_manager)** — regular organiser, cannot appear in admins.
3. **Anonymous participant** — fills public form at `/form/:id`.

## Implemented Features (2026-01-05)
- [x] Login page with pre-filled test credentials + red-highlight errors
- [x] Sidebar (contextual) + top header with active event name; theme toggle
- [x] Light / Dark theme via CSS vars, persisted in localStorage
- [x] Events list with cards, stats and registration-open chip
- [x] Create-event flow with duplicate-name validation
- [x] Participants list: column chips (Почта, Статус + form fields), hover-filter
      with Apply button, stats cards, XLSX export, pagination + search
- [x] Participant detail: edit answers, change status (dropdown), send mail
      shortcut, delete with modal confirmation
- [x] Form editor: preview + settings for every field, autosave after 700 ms,
      Toggle for required, type selector, options for radio/checkbox, allow-other,
      move up/down/hide/delete, "+ Добавить поле". Protected full_name and email
- [x] Event settings: name, registration_open, auto_mail, success-template
      selector, four Quill descriptions, Danger-zone delete with name confirmation
- [x] Mail compose: recipient chips + suggestions, template selector that
      replaces subject/body with preview, Quill editor, Send
- [x] Mail outbox with inline reader
- [x] Mail templates: create/read/edit/delete with confirmation
- [x] Managers (event) + Admins (global) using shared PeopleTable component
- [x] Public form: progress bar, dynamic anketa, submit → /success (or /fail)
- [x] Success / Fail static pages
- [x] Profile: update full_name/email + change-password with current-password check
- [x] Modal component (reusable), DataTable component (pagination + sort)
- [x] Russian date formatter — "20:30:52 5 июля 2026 (5 минут назад)"
- [x] Localised error messages: EVENT_ALREADY_EXISTS, INVALID_CREDENTIALS, etc.
- [x] `data-testid` on every interactive element

## Backlog / Deferred
- [ ] Real backend + MongoDB persistence
- [ ] Real email sending via SendGrid/Resend
- [ ] Registration flow (new users) & password reset
- [ ] File upload fields in the form builder
- [ ] Multi-language (English) UI

## Testing
- `iteration_1`: 100% frontend flows pass (see `/app/test_reports/iteration_1.json`).
  Only cosmetic notes (SaveIndicator idle chip, no ESC handler on Modal).
- Fix applied: SaveIndicator now hidden in true idle state.

## Next Actions
1. Wire real backend + MongoDB (P0 for production).
2. Add SendGrid/Resend for real emailing (P1).
3. Add per-event share link generator (nice-to-have).
