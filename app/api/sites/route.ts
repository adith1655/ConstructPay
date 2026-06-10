import { prisma } from "@/lib/prisma";
import { ok, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";

// List sites (with cost codes) visible to the current user, scoped to their company.
export async function GET() {
  const { user, response } = await authorize();
  if (!user) return response;

  // Platform owner does not operate company sites.
  if (user.role === ROLES.SUPER_ADMIN || !user.companyId) {
    return ok({ sites: [] });
  }

  const where =
    user.role === ROLES.ADMIN
      ? { active: true, companyId: user.companyId }
      : {
          active: true,
          companyId: user.companyId,
          assignments: { some: { userId: user.id } },
        };

  const sites = await prisma.jobSite.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      costCodes: {
        orderBy: { code: "asc" },
        select: { id: true, code: true, description: true },
      },
    },
  });

  return ok({ sites });
}
