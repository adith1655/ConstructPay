# ConstructPay — MVP (India edition)

A full-stack MVP of the **ConstructPay** payroll & workforce data platform for the
**Indian** construction industry.

## Role hierarchy

| Tier | Role | Scope |
|------|------|-------|
| 1 | **Platform Owner** (`SUPER_ADMIN`) | All tenants, subscription approvals |
| 2 | **Company Admin** (`ADMIN`) | Company team, sites, payroll, assets (view-only), materials |
| 3 | **Site Manager** (`SITE_MANAGER`) | Assigned sites: crew, assets CRUD, materials, approvals |
| 4 | **Worker** (`WORKER`) | Own timesheet, pay docs, assigned assets (read-only) |

New companies are onboarded only when the **Platform Owner** approves a subscription request (max **2 Company Admin seats** per subscription).

## What's implemented

- **Request Access** intake (no self-signup) + Platform Owner approval flow
- **Email/password** and **Google OAuth** (`Verify through Google`) — staged by role
- **Multi-site time tracking**, approvals, job costing, budget audit
- **Materials inventory** (indents, GRN, consumption)
- **Fixed assets** (Asset Tiger-style): CRUD by Site Manager, Admin view-only + edit requests, Worker assigned view
- **AI bill scanning** (OpenAI Vision) — pre-fills asset forms; consumables routed to expenses table
- **In-app alerts** for asset maintenance, warranty, idle flags

## Tech stack

- Next.js 14, TypeScript, Tailwind, Prisma (SQLite local / PostgreSQL production)
- JWT sessions + Google OAuth, zod validation, OpenAI gpt-4o for bill OCR

## Environment variables

Copy `.env.example` to `.env` and set:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite or PostgreSQL connection string |
| `JWT_SECRET` | Session signing secret |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `SUPER_ADMIN_GOOGLE_EMAIL` | Your Google email — bootstraps Platform Owner on first sign-in |
| `OPENAI_API_KEY` | Bill scanning OCR |

## Run locally

```bash
npm install
npm run setup
npm run dev
```

Sign in at `/login` with Google (Platform Owner after setting `SUPER_ADMIN_GOOGLE_EMAIL`) or email/password for provisioned users.

## First-time Platform Owner setup

1. Set `SUPER_ADMIN_GOOGLE_EMAIL` to your Google account in `.env`
2. Configure Google OAuth redirect: `http://localhost:3000/api/auth/google/callback`
3. Run `npm run db:seed` then click **Verify through Google** on `/login`

All other users are created through the subscription approval and provisioning flow (Company Admin → Site Managers → Workers).

## Deploying (Vercel + Neon)

1. Push to GitHub
2. Create Neon PostgreSQL (pooled connection string)
3. Set env vars in Vercel: `DATABASE_URL`, `JWT_SECRET`, `NEXTAUTH_URL`, Google OAuth, `SUPER_ADMIN_GOOGLE_EMAIL`, `OPENAI_API_KEY`
4. Deploy — `vercel-build` runs `db push` + minimal seed

For production, remove demo-heavy seeding if you add any; current seed only creates pending access requests and optional Super Admin stub.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run setup` | DB push + seed |
| `npm run db:reset` | Wipe and re-seed |

## Related docs

- [ConstructPay_RoleHierarchy_AssetTiger_Reference (1).md](./ConstructPay_RoleHierarchy_AssetTiger_Reference%20(1).md) — role + asset spec
- [ConstructPay_PRD_v1_0.md](./ConstructPay_PRD_v1_0.md) — product requirements
