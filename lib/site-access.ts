import { prisma } from "./prisma";
import { ROLES } from "./constants";

/** Returns true if the user may access the given job site within their company. */
export async function canAccessSite(
  user: { id: string; role: string; companyId: string | null },
  jobSiteId: string
) {
  const site = await prisma.jobSite.findUnique({
    where: { id: jobSiteId },
    select: { companyId: true, assignments: { where: { userId: user.id }, select: { id: true } } },
  });
  if (!site || site.companyId !== user.companyId) return false;
  if (user.role === ROLES.ADMIN) return true;
  return site.assignments.length > 0;
}
