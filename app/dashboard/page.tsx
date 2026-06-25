import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, LABOR_BURDEN_MULTIPLIER, TRANSFER_STATUS } from "@/lib/constants";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { currency, currencyCompact, hours, dateShort } from "@/lib/format";

export default async function OverviewPage() {
  const user = (await getCurrentUser())!;

  if (user.role === ROLES.SUPER_ADMIN) return <PlatformOverview name={user.fullName} />;
  if (user.role === ROLES.ADMIN)
    return <CompanyOverview companyId={user.companyId!} name={user.fullName} />;
  if (user.role === ROLES.SITE_MANAGER)
    return <ManagerOverview userId={user.id} companyId={user.companyId!} name={user.fullName} />;
  return <WorkerOverview userId={user.id} name={user.fullName} />;
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

async function PlatformOverview({ name }: { name: string }) {
  const [companies, pendingRequests, totalWorkers] = await Promise.all([
    prisma.company.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { users: true, jobSites: true } } },
    }),
    prisma.accessRequest.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: { in: [ROLES.WORKER, ROLES.SITE_MANAGER] } } }),
  ]);

  const activeCompanies = companies.filter((c) => c.active);
  const mrr = activeCompanies.reduce((s, c) => s + c.monthlyFee, 0);

  return (
    <div className="space-y-6">
      <PageHeading title={`Welcome, ${name.split(" ")[0]}`} subtitle="ConstructPay platform — all subscriber companies." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Subscriber companies" value={`${companies.length}`} accent="brand" hint={`${activeCompanies.length} active`} />
        <StatCard label="Monthly recurring revenue" value={currencyCompact(mrr)} accent="emerald" hint="Active subscriptions" />
        <StatCard label="Workforce on platform" value={`${totalWorkers}`} hint="Across all tenants" />
        <StatCard label="Subscription requests" value={`${pendingRequests}`} accent={pendingRequests ? "red" : "steel"} hint="Awaiting onboarding" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-steel-200 px-5 py-4">
          <h2 className="font-semibold text-steel-900">Subscriber companies</h2>
          <Link href="/dashboard/companies" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Manage tenants →
          </Link>
        </div>
        <div className="divide-y divide-steel-100">
          {companies.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <div className="font-medium text-steel-900">{c.name}</div>
                <div className="text-xs text-steel-500">
                  {c.city} · {c._count.users} users · {c._count.jobSites} sites
                </div>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="badge bg-steel-100 text-steel-700">{c.plan}</span>
                <span className="text-sm font-semibold text-steel-900">{currency(c.monthlyFee)}/mo</span>
                <span className={`badge ${c.active ? "bg-emerald-50 text-emerald-700" : "bg-steel-100 text-steel-500"}`}>
                  {c.active ? "Active" : "Suspended"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function CompanyOverview({ companyId, name }: { companyId: string; name: string }) {
  const [pendingApprovals, openShifts, pendingTransfers, projects] = await Promise.all([
    prisma.timeEntry.count({ where: { status: { in: ["PENDING", "FLAGGED"] }, jobSite: { companyId } } }),
    prisma.timeEntry.count({ where: { clockOut: null, jobSite: { companyId } } }),
    prisma.assetTransferRequest.count({ where: { companyId, status: TRANSFER_STATUS.PENDING } }),
    prisma.project.findMany({
      where: { companyId },
      include: {
        jobSite: { select: { name: true } },
        costCodes: {
          include: {
            timeEntries: {
              where: { status: "APPROVED" },
              include: { user: { select: { hourlyRate: true } } },
            },
          },
        },
      },
    }),
  ]);

  const projectRows = projects.map((p) => {
    const budget = p.costCodes.reduce((s, c) => s + c.budgetCost, 0);
    const actual = p.costCodes.reduce(
      (s, c) =>
        s + c.timeEntries.reduce((t, e) => t + e.hours * e.user.hourlyRate * LABOR_BURDEN_MULTIPLIER, 0),
      0
    );
    return {
      id: p.id,
      name: p.name,
      site: p.jobSite.name,
      budget,
      actual,
      pct: budget > 0 ? Math.round((actual / budget) * 100) : 0,
    };
  });

  const totalActual = projectRows.reduce((s, p) => s + p.actual, 0);

  return (
    <div className="space-y-6">
      <PageHeading title={`Welcome back, ${name.split(" ")[0]}`} subtitle="Your company operations across all job sites." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Accrued labour cost" value={currencyCompact(totalActual)} accent="brand" hint="Approved time, all projects" />
        <StatCard label="On the clock now" value={`${openShifts}`} accent="emerald" hint="Live across your sites" />
        <StatCard label="Pending approvals" value={`${pendingApprovals}`} accent="amber" hint="Muster awaiting review" />
        <StatCard label="Pending asset transfers" value={`${pendingTransfers}`} accent={pendingTransfers ? "red" : "steel"} hint="Awaiting your approval" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-steel-200 px-5 py-4">
          <h2 className="font-semibold text-steel-900">Project labour — budget vs. actual</h2>
          <Link href="/dashboard/job-costing" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            View job costing →
          </Link>
        </div>
        <div className="divide-y divide-steel-100">
          {projectRows.map((p) => (
            <div key={p.id} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-steel-900">{p.name}</div>
                  <div className="text-xs text-steel-500">{p.site}</div>
                </div>
                <div className="text-right text-sm">
                  <span className="font-semibold text-steel-900">{currencyCompact(p.actual)}</span>
                  <span className="text-steel-400"> / {currencyCompact(p.budget)}</span>
                </div>
              </div>
              <Bar pct={p.pct} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/dashboard/approvals" className="card p-5 transition hover:shadow-md">
          <div className="text-sm font-medium text-steel-500">Approve timesheets</div>
          <div className="mt-2 text-2xl font-bold text-steel-900">→</div>
          <div className="mt-1 text-xs text-steel-400">Clear muster before payroll cut-off</div>
        </Link>
        <Link href="/dashboard/asset-transfers" className="card p-5 transition hover:shadow-md">
          <div className="text-sm font-medium text-steel-500">Asset transfer reports</div>
          <div className="mt-2 text-2xl font-bold text-steel-900">→</div>
          <div className="mt-1 text-xs text-steel-400">Site-wise inbound / outbound history</div>
        </Link>
      </div>
    </div>
  );
}

async function ManagerOverview({ userId, companyId, name }: { userId: string; companyId: string; name: string }) {
  const sites = await prisma.jobSite.findMany({
    where: { companyId, assignments: { some: { userId } } },
    select: { id: true, name: true },
  });
  const siteIds = sites.map((s) => s.id);

  const [openShifts, pendingApprovals, weekHours, myPendingTransfers] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { jobSiteId: { in: siteIds }, clockOut: null },
      include: { user: { select: { fullName: true, trade: true } }, jobSite: { select: { name: true } } },
    }),
    prisma.timeEntry.count({ where: { jobSiteId: { in: siteIds }, status: { in: ["PENDING", "FLAGGED"] } } }),
    prisma.timeEntry.aggregate({
      where: { jobSiteId: { in: siteIds }, clockIn: { gte: startOfWeek() }, status: "APPROVED" },
      _sum: { hours: true },
    }),
    prisma.assetTransferRequest.count({
      where: { requestedById: userId, status: TRANSFER_STATUS.PENDING },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeading title={`Welcome back, ${name.split(" ")[0]}`} subtitle={`Site Manager — ${sites.map((s) => s.name).join(", ")}`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Crew on the clock" value={`${openShifts.length}`} accent="emerald" />
        <StatCard label="Pending approvals" value={`${pendingApprovals}`} accent="amber" hint="On your sites" />
        <StatCard label="My pending transfers" value={`${myPendingTransfers}`} accent={myPendingTransfers ? "red" : "steel"} hint="Awaiting admin approval" />
        <StatCard label="Approved hours this week" value={hours(weekHours._sum.hours ?? 0)} accent="brand" />
      </div>

      <Link href="/dashboard/asset-transfers" className="card block p-5 transition hover:shadow-md">
        <div className="text-sm font-medium text-steel-500">Asset transfer reports</div>
        <div className="mt-2 text-2xl font-bold text-steel-900">→</div>
        <div className="mt-1 text-xs text-steel-400">Site-wise transfer history for your sites</div>
      </Link>

      <div className="card">
        <div className="flex items-center justify-between border-b border-steel-200 px-5 py-4">
          <h2 className="font-semibold text-steel-900">Crew currently on the clock</h2>
          <Link href="/dashboard/approvals" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Approve timesheets →
          </Link>
        </div>
        {openShifts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-steel-500">No crew currently clocked in.</p>
        ) : (
          <div className="divide-y divide-steel-100">
            {openShifts.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="font-medium text-steel-900">{e.user.fullName}</div>
                  <div className="text-xs text-steel-500">{e.user.trade} · {e.jobSite.name}</div>
                </div>
                <StatusBadge status="OPEN" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function WorkerOverview({ userId, name }: { userId: string; name: string }) {
  const [open, weekAgg, recent] = await Promise.all([
    prisma.timeEntry.findFirst({
      where: { userId, clockOut: null },
      include: { jobSite: { select: { name: true } } },
    }),
    prisma.timeEntry.aggregate({ where: { userId, clockIn: { gte: startOfWeek() } }, _sum: { hours: true } }),
    prisma.timeEntry.findMany({
      where: { userId },
      orderBy: { clockIn: "desc" },
      take: 5,
      include: { jobSite: { select: { name: true } }, costCode: { select: { code: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeading title={`Namaste, ${name.split(" ")[0]}`} subtitle="Your shifts and pay at a glance." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Status" value={open ? "On the clock" : "Clocked out"} accent={open ? "emerald" : "steel"} hint={open ? open.jobSite.name : "Head to My Timesheet to clock in"} />
        <StatCard label="Hours this week" value={hours(weekAgg._sum.hours ?? 0)} accent="brand" />
        <Link href="/dashboard/timesheet" className="card p-5 transition hover:shadow-md">
          <div className="text-sm font-medium text-steel-500">Clock in / out</div>
          <div className="mt-2 text-2xl font-bold text-brand-600">→</div>
          <div className="mt-1 text-xs text-steel-400">Go to My Timesheet</div>
        </Link>
      </div>

      <div className="card">
        <div className="border-b border-steel-200 px-5 py-4">
          <h2 className="font-semibold text-steel-900">Recent shifts</h2>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-steel-500">No shifts logged yet.</p>
        ) : (
          <div className="divide-y divide-steel-100">
            {recent.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="font-medium text-steel-900">{dateShort(e.clockIn)} · {e.jobSite.name}</div>
                  <div className="text-xs text-steel-500">{e.costCode?.code ?? "No cost code"} · {hours(e.hours)}</div>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-steel-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-steel-500">{subtitle}</p>}
    </div>
  );
}

function Bar({ pct }: { pct: number }) {
  const color = pct >= 90 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="mt-2.5 flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-steel-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-semibold text-steel-500">{pct}%</span>
    </div>
  );
}
