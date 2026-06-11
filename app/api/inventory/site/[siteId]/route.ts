import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { MANAGER_ROLES } from "@/lib/constants";
import { canAccessSite } from "@/lib/site-access";

export async function GET(
  _req: Request,
  { params }: { params: { siteId: string } }
) {
  const { user, response } = await authorize(MANAGER_ROLES);
  if (!user || !user.companyId) return response ?? ok({ stock: [] });

  if (!(await canAccessSite(user, params.siteId))) {
    return error("You do not have access to this job site.", 403);
  }

  const stock = await prisma.siteInventory.findMany({
    where: { jobSiteId: params.siteId },
    include: {
      inventoryItem: {
        select: { id: true, name: true, sku: true, unitOfMeasure: true, minStockLevel: true },
      },
    },
    orderBy: { inventoryItem: { name: "asc" } },
  });

  return ok({ stock });
}
