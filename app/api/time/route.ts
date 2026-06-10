import { prisma } from "@/lib/prisma";
import { ok, authorize } from "@/lib/api";
import { ROLES, MANAGER_ROLES } from "@/lib/constants";

// GET /api/time?scope=mine|approvals
export async function GET(req: Request) {
  const { user, response } = await authorize();
  if (!user) return response;

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "mine";

  if (scope === "approvals") {
    if (!MANAGER_ROLES.includes(user.role as never) || !user.companyId) {
      return ok({ entries: [] });
    }

    // Admin sees all company sites; Site Manager sees only assigned sites.
    const siteFilter =
      user.role === ROLES.ADMIN
        ? { jobSite: { companyId: user.companyId } }
        : {
            jobSite: {
              companyId: user.companyId,
              assignments: { some: { userId: user.id } },
            },
          };

    const entries = await prisma.timeEntry.findMany({
      where: {
        clockOut: { not: null },
        status: { in: ["PENDING", "FLAGGED"] },
        ...siteFilter,
      },
      orderBy: { clockIn: "desc" },
      include: {
        user: { select: { fullName: true, trade: true, classification: true } },
        jobSite: { select: { name: true } },
        costCode: { select: { code: true, description: true } },
      },
    });
    return ok({ entries });
  }

  // Default: my own entries
  const entries = await prisma.timeEntry.findMany({
    where: { userId: user.id },
    orderBy: { clockIn: "desc" },
    take: 50,
    include: {
      jobSite: { select: { name: true } },
      costCode: { select: { code: true, description: true } },
    },
  });

  const open = entries.find((e) => e.clockOut === null) ?? null;
  return ok({ entries, open });
}
