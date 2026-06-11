import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { MANAGER_ROLES } from "@/lib/constants";
import { canAccessSite } from "@/lib/site-access";

const consumeSchema = z.object({
  siteId: z.string().min(1),
  itemId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  costCodeId: z.string().min(1),
});

export async function POST(req: Request) {
  const { user, response } = await authorize(MANAGER_ROLES);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const body = await req.json().catch(() => null);
  const parsed = consumeSchema.safeParse(body);
  if (!parsed.success) return error("Invalid consumption record.");

  if (!(await canAccessSite(user, parsed.data.siteId))) {
    return error("You do not have access to this job site.", 403);
  }

  const costCode = await prisma.costCode.findFirst({
    where: {
      id: parsed.data.costCodeId,
      jobSiteId: parsed.data.siteId,
      project: { companyId: user.companyId },
    },
  });
  if (!costCode) return error("Cost code not found for this site.", 404);

  const stock = await prisma.siteInventory.findUnique({
    where: {
      jobSiteId_inventoryItemId: {
        jobSiteId: parsed.data.siteId,
        inventoryItemId: parsed.data.itemId,
      },
    },
  });
  if (!stock || stock.quantityAvailable < parsed.data.quantity) {
    return error("Insufficient stock on site.");
  }

  await prisma.siteInventory.update({
    where: { id: stock.id },
    data: { quantityAvailable: { decrement: parsed.data.quantity } },
  });

  return ok({ consumed: true, remaining: stock.quantityAvailable - parsed.data.quantity });
}
