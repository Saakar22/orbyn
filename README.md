# Orbyn

From financial intent to intelligent execution. Orbyn is an AI invoicing assistant on the PayPal sandbox:
tell it what you need in plain words, review the plan, approve it, and get paid. An invoice turns paid only
after PayPal confirms the capture.

Built for the PayPal AI Hackathon. Everything runs against the **PayPal sandbox**; no real money moves.

## What's inside

- **Landing page** with a scroll-driven story (GSAP ScrollTrigger + Lenis), a front-end-only playground, and a
  one-click live demo.
- **Accounts** with Auth.js: email and password (argon2id), optional Google sign-in, password reset, rate limits,
  revocable sessions ("sign out other sessions"), and a guest demo that can be turned into a real account.
- **Onboarding** in three steps (business profile, starting data, PayPal sandbox) and a one-time welcome tour.
- **App**: dashboard, assistant, invoices, transactions (filters + CSV export), settings. Ctrl/⌘ K opens a command palette.
- **Safety rails**: the assistant can only draft. Issuing an invoice or scheduling a reminder needs your approval,
  and approvals are signed server-side. Every query is scoped to the signed-in person's workspace.

## Stack

Next.js 16 (App Router, Cache Components, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 + shadcn/Radix ·
Prisma 7 + PostgreSQL · Auth.js v5 · AI SDK 7 + Gemini · PayPal Orders v2 (sandbox) · Recharts · Vitest.

Requires **Node 24.7 or newer** (argon2id comes from Node's built-in `crypto`).

## Run it locally

```bash
npm install
cp .env.example .env        # then fill in the values, see below
npm run db:migrate          # creates the tables
npm run dev                 # http://localhost:3200
```

The app runs on **port 3200**, not 3000, so it never collides with another local project's cached pages
(a service worker registered by a different app on `localhost:3000` would otherwise serve its offline page).

### Environment variables

All keys live in `.env` (never committed). `.env.example` documents each one.

| Variable | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `SESSION_SECRET` | yes | 32+ random characters; signs the session cookie (`AUTH_SECRET` also accepted) |
| `APP_URL` | yes | Public base URL, used in pay links and password-reset links (`http://localhost:3200` locally) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | for the assistant | Gemini API key |
| `GEMINI_MODEL` | no | Main model, default `gemini-flash-latest` |
| `GEMINI_FALLBACK_MODEL` | no | Used automatically when the main model is overloaded, default `gemini-flash-lite-latest` |
| `PAYPAL_ENV`, `PAYPAL_BASE_URL` | for payments | `sandbox` and `https://api-m.sandbox.paypal.com` |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | for payments | Sandbox REST app credentials |
| `PAYPAL_WEBHOOK_ID` | optional | Verifies PayPal webhooks (needs a public URL) |
| `TOOL_APPROVAL_SECRET` | yes | 32+ random bytes; signs assistant approvals |
| `CRON_SECRET` | for reminders | Protects `/api/cron/reminders` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional | "Continue with Google". The button is hidden when these are empty. Redirect URI: `<APP_URL>/api/auth/callback/google` |

No email provider is configured: in development, password-reset links are printed to the server console.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3200 |
| `npm run build` / `npm start` | Production build / serve on port 3200 |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm test` | Vitest: unit tests plus database tests (accounts, password reset, rate limits, workspace isolation, route protection). Database tests use `DATABASE_URL` and clean up after themselves; they are skipped if it is unset. |
| `npm run db:migrate` / `db:seed` / `db:reset` | Prisma migrations, seed a demo workspace, reset the database |

## Routes

| Area | Routes |
|---|---|
| Public | `/`, `/pay/[token]`, `/terms`, `/privacy` |
| Auth (signed-in people are sent to `/dashboard`) | `/signup`, `/login`, `/forgot-password`, `/reset-password` |
| Signed in (protected by `src/proxy.ts` and checked again on the server) | `/onboarding`, `/dashboard`, `/assistant/[[...id]]`, `/invoices`, `/invoices/new`, `/invoices/[id]`, `/transactions`, `/settings` |
| API | `/api/auth/[...nextauth]`, `/api/agent/chat`, `/api/transactions/export`, `/api/paypal/webhook`, `/api/cron/reminders` |

## How the data is organised

Each person owns one **workspace**; clients, invoices, transactions, conversations and audit entries all belong
to a workspace and every query filters by it. Sessions are rows in the database: the cookie only carries the
session id, so signing out elsewhere, resetting a password or deleting the account takes effect on the next
request. "Try the live demo" creates a guest with a seeded workspace; every sample record is labelled **Demo**.
