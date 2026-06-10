import { prisma } from "@/lib/prisma";
import { ok, authorize } from "@/lib/api";
import { ROLES, MANAGER_ROLES, LABOR_BURDEN_MULTIPLIER } from "@/lib/constants";

// Real-time labor cost roll-up: budget vs. actual by project & cost code,
// scoped to the current user's company.
export async function GET() {
  const { user, response } = await authorize(MANAGER_ROLES);
  if (!user) return response;
  if (!user.companyId) return ok({ projects: [] });

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
        include: {
          timeEntries: {
            where: { status: "APPROVED" },
            include: { user: { select: { hourlyRate: true } } },
          },
        },
      },
    },
  });

  const result = projects.map((p) => {
    const costCodes = p.costCodes.map((cc) => {
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
        actualHours: Math.round(actualHours * 100) / 100,
        actualCost: Math.round(actualCost * 100) / 100,
        pctConsumed:
          cc.budgetCost > 0
            ? Math.round((actualCost / cc.budgetCost) * 1000) / 10
            : 0,
      };
    });

    return {
      id: p.id,
      name: p.name,
      siteName: p.jobSite.name,
      contractValue: p.contractValue,
      budgetCost: costCodes.reduce((s, c) => s + c.budgetCost, 0),
      actualCost: Math.round(costCodes.reduce((s, c) => s + c.actualCost, 0) * 100) / 100,
      costCodes,
    };
  });

  return ok({ projects: result });
}
