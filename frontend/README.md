# Client Ledger Management System — Frontend

React + Vite app that talks to the backend in `client-ledger-backend`. Mobile-first,
glassmorphism banking/wallet UI matching the original blueprint design direction.

## 1. Install

```bash
cd frontend
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Set `VITE_API_BASE_URL` to wherever the backend is running (default assumes
`http://localhost:5000/api`).

## 3. Run

```bash
npm run dev
```

Opens on `http://localhost:5173`. Make sure the backend's `CORS_ORIGIN` in its own
`.env` matches this URL exactly, and that you've already run `npm run seed:admin` on
the backend so you have a Super Admin to log in with.

## 4. Build for production

```bash
npm run build
npm run preview   # to sanity-check the production build locally
```

## What's here

- **Auth** — cookie-based session (the backend sets httpOnly JWT cookies), with silent
  token refresh on 401s and a proper logout flow
- **Dashboard** — every client at a glance, live balance, search, create
- **Client detail** — subclients, transaction table with type/category/date filters,
  pagination, inline add/edit/delete
- **Reports** — credit/debit/net totals, category breakdown, a simple monthly bar chart,
  with a date-range filter
- **Users** — Super Admin only: create, edit, deactivate, remove admin accounts
- **RBAC-aware UI** — delete buttons for clients/transactions and the Users nav link only
  render for `super_admin` sessions; the backend enforces the same rules independently,
  so this is convenience, not the actual security boundary

## Design notes

- Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (every rupee figure, for
  tabular alignment)
- All icons are hand-written inline SVG, one shared stroke weight — no icon library
- Dark gradient + glass surfaces, gold as the single accent, teal/coral for credit/debit
- No `localStorage`/`sessionStorage` — auth lives entirely in httpOnly cookies set by
  the backend, which is also why there's no token-handling code to audit here

## Depth and motion

- **`Tilt3D`** (`src/components/Tilt3D.jsx`) wraps client cards and stat cards with real
  pointer-driven 3D rotation — the tilt follows where the cursor actually is over the
  card, with a matching shadow and gold glow shift, so it reads as physical depth rather
  than a canned CSS animation. It only engages for mouse/trackpad input (never hijacks a
  touch scroll) and fully no-ops under `prefers-reduced-motion`.
- **`AnimatedMoney`** (`src/components/AnimatedMoney.jsx`) counts a balance up or down
  from its previous value over ~500ms whenever it changes, instead of just replacing the
  number — small thing, but it's what makes a balance update after adding a transaction
  feel like it *happened* rather than the page just re-rendering.
- **Bottom nav on mobile**: below 860px the sidebar is replaced by a fixed,
  thumb-reachable bottom bar (Dashboard / Reports / Users) instead of a hamburger menu —
  the whole point of "easy to access" is not making someone dig through a dropdown for
  the one thing they came to do.

## Ledger safety (matches the backend)

Transaction creation sends an `Idempotency-Key` header (one UUID generated per form
submission, reused if the same submission is retried) so a flaky connection or a
double-tapped "Add transaction" button can't create a duplicate entry — the backend
recognizes the repeated key and replays the original response instead of processing it twice.

## Known gaps (matching the backend's README)

No file upload for bills, no Excel/PDF/CSV export yet — the backend doesn't implement
these either. Happy to build both next.
