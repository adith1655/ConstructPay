import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, MANAGER_ROLES, LABOR_BURDEN_MULTIPLIER } from "@/lib/constants";
import { currency, currencyCompact, hours } from "@/lib/format";

export default async function JobCostingPage() {
  const user = (await getCurrentUser())!;
  if (!MANAGER_ROLES.includes(user.role as never) || !user.companyId) redirect("/dashboard");

  const where =
    user.role === ROLES.ADMIN
      ? { companyId: user.companyId }
      : {
          companyId: user.companyId,
          jobSite: { assignments: { some: { userId: user.id } } },
        };

  const projects = await prisma.project.findMany({
    where,
    include: {
      jobSite: { select: { name: true } },
      costCodes: {
        orderBy: { code: "asc" },
        include: {
          timeEntries: {
            where: { status: "APPROVED" },
            include: { user: { select: { hourlyRate: true } } },
          },
        },
      },
    },
  });

  const data = projects.map((p) => {
    const codes = p.costCodes.map((cc) => {
      const actualHours = cc.timeEntries.reduce((s, e) => s + e.hours, 0);
      const actualCost = cc.timeEntries.reduce(
        (s, e) => s + e.hours * e.user.hourlyRate * LABOR_BURDEN_MULTIPLIER,
        0
      );
      return {
        id: cc.id,
        code: cc.code,
        description: cc.description,
        budgetHours: cc.budgetHours,
        budgetCost: cc.budgetCost,
        actualHours,
        actualCost,
        pct: cc.budgetCost > 0 ? Math.round((actualCost / cc.budgetCost) * 100) : 0,
      };
    });
    const budget = codes.reduce((s, c) => s + c.budgetCost, 0);
    const actual = codes.reduce((s, c) => s + c.actualCost, 0);
    return {
      id: p.id,
      name: p.name,
      site: p.jobSite.name,
      contractValue: p.contractValue,
      budget,
      actual,
      pct: budget > 0 ? Math.round((actual / budget) * 100) : 0,
      codes,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-steel-900">Job Costing</h1>
        <p className="mt-1 text-sm text-steel-500">
          Real-time labor cost vs. budget. Costs accrue the moment a timesheet is approved
          (wage × hours × {LABOR_BURDEN_MULTIPLIER}× burden for taxes &amp; fringe).
        </p>
      </div>

      {data.length === 0 && (
        <div className="card p-8 text-center text-sm text-steel-500">No projects to display.</div>
      )}

      {data.map((p) => (
        <div key={p.id} className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-steel-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-steel-900">{p.name}</h2>
              <p className="text-xs text-steel-500">{p.site} · Contract {currencyCompact(p.contractValue)}</p>
            </div>
            <div className="text-right text-sm">
              <div className="font-semibold text-steel-900">
                {currencyCompact(p.actual)} <span className="text-steel-400">/ {currencyCompact(p.budget)}</span>
              </div>
              <div className={`text-xs font-medium ${p.pct >= 90 ? "text-red-600" : p.pct >= 80 ? "text-amber-600" : "text-emerald-600"}`}>
                {p.pct}% of labor budget consumed
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-steel-50 text-left text-xs uppercase tracking-wide text-steel-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Cost Code</th>
                  <th className="px-5 py-3 font-medium">Budget Hrs</th>
                  <th className="px-5 py-3 font-medium">Actual Hrs</th>
                  <th className="px-5 py-3 font-medium">Budget Cost</th>
                  <th className="px-5 py-3 font-medium">Actual Cost</th>
                  <th className="px-5 py-3 font-medium w-48">Consumed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {p.codes.map((c) => (
                  <tr key={c.id}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-steel-900">{c.code}</div>
                      <div className="text-xs text-steel-500">{c.description}</div>
                    </td>
                    <td className="px-5 py-3 text-steel-600">{hours(c.budgetHours)}</td>
                    <td className="px-5 py-3 text-steel-600">{hours(c.actualHours)}</td>
                    <td className="px-5 py-3 text-steel-600">{currency(c.budgetCost)}</td>
                    <td className="px-5 py-3 font-medium text-steel-900">{currency(c.actualCost)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-steel-100">
                          <div
                            className={`h-full rounded-full ${c.pct >= 90 ? "bg-red-500" : c.pct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${Math.min(c.pct, 100)}%` }}
                          />
                        </div>
                        <span className="w-9 text-right text-xs font-semibold text-steel-500">{c.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
