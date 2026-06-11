# ConstructPay — Demo Accounts

Use these credentials after running `npm run setup` or `npm run db:seed`. The login page
at [http://localhost:3000/login](http://localhost:3000/login) also has quick-fill buttons
for the primary roles.

> **Security:** These accounts exist only for local development and demo deployments.
> Do not use this password in production. Remove or replace seeded accounts before a
> real launch.

## Shared password

| Field    | Value            |
|----------|------------------|
| Password | `Password123!`   |

All seeded users share this password.

---

## Platform (ConstructPay operator)

| Role | Name | Email | Password |
|------|------|-------|----------|
| Platform Owner (`SUPER_ADMIN`) | Aditya Rao | `owner@constructpay.in` | `Password123!` |

**What to try:** Companies list, subscription requests, tenant MRR overview.

---

## Tenant 1 — Sentinel Infra Pvt Ltd (Mumbai)

| Role | Name | Email | Password | Notes |
|------|------|-------|----------|-------|
| Company Admin (`ADMIN`) | Rajesh Khanna | `admin@sentinelinfra.in` | `Password123!` | Full company control |
| Site Manager (`SITE_MANAGER`) | Meena Iyer | `foreman@sentinelinfra.in` | `Password123!` | Sites: BKC, Worli |
| Worker (`WORKER`) | Imran Shaikh | `worker@sentinelinfra.in` | `Password123!` | Electrician · BKC |
| Worker (`WORKER`) | Suresh Yadav | `carpenter@sentinelinfra.in` | `Password123!` | Carpenter · BKC |
| Worker (`WORKER`) | Anil Gupta | `welder@sentinelinfra.in` | `Password123!` | Contract welder · Worli (PAN/GSTIN missing) |

**Job sites:** BKC Commercial Tower, Worli Sea-Face Residences

**Suggested flows by role:**

| Role | Tabs to open |
|------|----------------|
| Company Admin | Site Managers · Team & Roles · Budget Audit · Inventory · Job Costing |
| Site Manager | Crew / Workers · Approvals · Budget Audit · Inventory · My Timesheet |
| Worker | My Timesheet · Pay & Documents |

---

## Tenant 2 — Capital Buildtech Ltd (New Delhi)

| Role | Name | Email | Password | Notes |
|------|------|-------|----------|-------|
| Company Admin (`ADMIN`) | Priya Nair | `admin@capitalbuildtech.in` | `Password123!` | Delhi tenant |
| Site Manager (`SITE_MANAGER`) | Vikram Singh | `foreman@capitalbuildtech.in` | `Password123!` | Sites: Dwarka, Connaught Place |
| Worker (`WORKER`) | Deepak Verma | `mason@capitalbuildtech.in` | `Password123!` | Mason · Dwarka |

**Job sites:** Dwarka Expressway Metro Depot, Connaught Place Retail Retrofit

---

## Quick reference (most common logins)

| Role | Email | Password |
|------|-------|----------|
| Platform Owner | `owner@constructpay.in` | `Password123!` |
| Company Admin (Mumbai) | `admin@sentinelinfra.in` | `Password123!` |
| Site Manager (Mumbai) | `foreman@sentinelinfra.in` | `Password123!` |
| Worker (Mumbai) | `worker@sentinelinfra.in` | `Password123!` |
| Company Admin (Delhi) | `admin@capitalbuildtech.in` | `Password123!` |

---

## Reset demo data

```bash
npm run db:reset    # wipe DB and re-seed all accounts above
npm run db:seed     # re-run seed only (idempotent upserts)
```
