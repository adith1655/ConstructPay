import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { MANAGER_ROLES } from "@/lib/constants";
import { canAccessSite } from "@/lib/site-access";

const grnItemSchema = z.object({
  item_id: z.string().min(1),
  qty_received: z.coerce.number().positive(),
  unit_price: z.coerce.number().min(0).default(0),
});

const createSchema = z.object({
  siteId: z.string().min(1),
  indentId: z.string().optional(),
  vendorName: z.string().min(1),
  invoiceOrChallan: z.string().min(1),
  itemsReceived: z.array(grnItemSchema).min(1),
});

export async function POST(req: Request) {
  const { user, response } = await authorize(MANAGER_ROLES);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error("Invalid goods receipt.");

  if (!(await canAccessSite(user, parsed.data.siteId))) {
    return error("You do not have access to this job site.", 403);
  }

  const grn = await prisma.$transaction(async (tx) => {
    const created = await tx.goodsReceiptNote.create({
      data: {
        jobSiteId: parsed.data.siteId,
        indentId: parsed.data.indentId,
        receivedBy: user.id,
        vendorName: parsed.data.vendorName,
        invoiceOrChallan: parsed.data.invoiceOrChallan,
        itemsReceived: JSON.stringify(parsed.data.itemsReceived),
      },
    });

    for (const line of parsed.data.itemsReceived) {
      await tx.siteInventory.upsert({
        where: {
          jobSiteId_inventoryItemId: {
            jobSiteId: parsed.data.siteId,
            inventoryItemId: line.item_id,
          },
        },
        create: {
          jobSiteId: parsed.data.siteId,
          inventoryItemId: line.item_id,
          quantityAvailable: line.qty_received,
        },
        update: {
          quantityAvailable: { increment: line.qty_received },
        },
      });
    }

    if (parsed.data.indentId) {
      await tx.materialIndent.update({
        where: { id: parsed.data.indentId },
        data: { status: "ORDERED" },
      });
    }

    return created;
  });

  return ok({ id: grn.id }, { status: 201 });
}
