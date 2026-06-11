# ConstructPay — MVP (India edition)

A full-stack MVP of the **ConstructPay** payroll & workforce data platform for the
**Indian** construction industry, built from `ConstructPay_PRD_v1_0.md`.

Everything is rupee-first: currency and figures use the Indian numbering system
(thousand / lakh / crore, e.g. `₹1,23,45,678`), statutory deductions follow Indian
norms (PF, ESI, Professional Tax, TDS), and the demo data is set in metros like
**Mumbai** and **New Delhi**.

## Role hierarchy

ConstructPay is multi-tenant. From the top down:

| Tier | Role | Who | Scope |
|------|------|-----|-------|
| 1 | **Platform Owner** (`SUPER_ADMIN`) | The ConstructPay developer/owner — a single account | All subscriber companies, MRR, onboarding |
| 2 | **Company Admin** (`ADMIN`) | The company that buys a ConstructPay subscription (the tenant) | Their own company: team, sites, payroll, job costing, inventory |
| 3 | **Site Manager** (`SITE_MANAGER`) | Foreman / site engineer | Assigned job sites: approvals, costing, crew, inventory |
| 4 | **Worker** (`WORKER`) | On-roll employee or contract labour | Own timesheet, pay slips & documents |

A new company is onboarded only when the **Platform Owner** approves a subscription
request — this provisions a `Company` tenant plus its first `ADMIN` account.

## What's implemented

- **Public landing page** (About, Features, Sign In) with a **Request Access** intake
  flow that creates a subscription request — never an account.
- **Auth + RBAC** across the 4 tiers, with JWT sessions in an httpOnly cookie and
  bcrypt hashing. Every API route enforces role + company scoping server-side.
- **Platform console** (Owner) — companies/tenants list with plan, MRR, suspend/activate.
- **Multi-site time tracking** — clock in/out with job-site & cost-code tagging and a
  geofence-override flag.
- **Timesheet approvals** — Admin/Site Manager approve or reject; workers can dispute.
- **Real-time job costing** in ₹ — budget vs. actual labour cost by cost code & project.
- **Budget audit** — add, update, and remove budget line items (cost codes) with a full
  audit trail. Site managers can add/update; company admins can also remove lines.
- **Inventory management** — master catalog, per-site stock, material indents, goods
  receipt (GRN), and consumption tied to cost codes.
- **User provisioning**
  - **Company Admin** → **Site Managers** tab to create foreman logins
  - **Site Manager** → **Crew / Workers** tab to create worker logins (auto-assigned to their sites)
  - **Team & Roles** (Admin) — full roster, wage rates, PAN/GSTIN blocking for contractors
- **Pay & documents** — weekly pay slips with PF/ESI/PT (or TDS) deductions, Form 16/16A.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma ORM** — **SQLite** locally, **PostgreSQL** (Neon) in production (auto-switched)
- **jose** (JWT) + **bcryptjs** auth, **zod** validation

## Run locally

### Easiest: double-click `start.bat` (Windows)

It checks Node, installs dependencies, creates `.env`, sets up the database with demo
data, starts the dev server, and opens the browser.

### Manual

```bash
npm install        # also runs prisma generate
npm run setup      # create DB + seed demo data
npm run dev        # http://localhost:3000
```

## Demo accounts

All seeded users share the password **`Password123!`**.

| Role | Email |
|------|-------|
| Platform Owner | `owner@constructpay.in` |
| Company Admin (Mumbai) | `admin@sentinelinfra.in` |
| Site Manager (Mumbai) | `foreman@sentinelinfra.in` |
| Worker (Mumbai) | `worker@sentinelinfra.in` |
| Company Admin (Delhi) | `admin@capitalbuildtech.in` |

For the full list (both tenants, all workers, site assignments, and role-specific
flows), see **[DEMO_ACCOUNTS.md](./DEMO_ACCOUNTS.md)**.

## Deploying to GitHub + Vercel

This repo is deploy-ready. SQLite cannot persist on Vercel's serverless filesystem,
so production uses **PostgreSQL** — the Prisma provider switches automatically based
on `DATABASE_URL` (see `scripts/set-db-provider.mjs`).

1. **Push to GitHub.** `.env`, `node_modules`, and the local SQLite DB are gitignored.
2. **Create a Postgres database** — e.g. [Neon](https://neon.tech) (free tier, use the
   **pooled** connection string) or [Vercel Postgres](https://vercel.com/storage/postgres).
3. **Import the repo into Vercel** (New Project → import from GitHub).
4. **Set Environment Variables** in Vercel (Production + Preview):
   - `DATABASE_URL` = your `postgresql://...?sslmode=require` pooled connection string
   - `JWT_SECRET` = a long random string
     (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
5. **Deploy.** Vercel runs the `vercel-build` script, which:
   `set provider → prisma generate → prisma db push → seed → next build`.
   The schema and demo data are created on first deploy (the seed is idempotent, so
   redeploys won't wipe real data).

Connecting a **custom domain** is just Vercel → Project → Settings → Domains; no code
changes needed (cookies use `secure` + `sameSite=lax` automatically in production).

> Note: the build seeds demo accounts so the deployment is usable immediately. For a
> real launch, remove the `tsx prisma/seed.ts` step from `vercel-build` and create your
> own Platform Owner account. See [DEMO_ACCOUNTS.md](./DEMO_ACCOUNTS.md) for what gets seeded.

## Scripts

| Script             | Description                                            |
|--------------------|--------------------------------------------------------|
| `npm run dev`      | Development server                                     |
| `npm run build`    | Production build (also type-checks)                    |
| `npm run setup`    | Provider + generate + db push + seed                   |
| `npm run db:seed`  | Re-run seed (idempotent upserts)                       |
| `npm run db:reset` | Wipe and re-seed the database                          |

## Indian statutory model (MVP simplifications)

- **Job-cost burden:** approved labour accrues at `wage × hours × 1.2` (employer PF/ESI/on-costs).
- **Pay-slip deductions:** PF 12% (employee), ESI 0.75% (if monthly wage < ₹21,000),
  Professional Tax ₹200/month; contractors deduct 1% TDS (Sec 194C).
- These are indicative figures for the demo, not certified payroll calculations.
  Email delivery, PDF/Form 16 generation, and a full statutory engine are out of scope
  for this MVP.

## Related docs

| File | Description |
|------|-------------|
| [DEMO_ACCOUNTS.md](./DEMO_ACCOUNTS.md) | All demo logins, passwords, tenants, and suggested test flows |
| [ConstructPay_PRD_v1_0.md](./ConstructPay_PRD_v1_0.md) | Product requirements document |
