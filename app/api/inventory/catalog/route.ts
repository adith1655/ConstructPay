import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { MANAGER_ROLES, ROLES } from "@/lib/constants";

export async function GET() {
  const { user, response } = await authorize(MANAGER_ROLES);
  if (!user) return response;

  const items = await prisma.inventoryItem.findMany({
    orderBy: { name: "asc" },
  });
  return ok({ items });
}

const createSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  unitOfMeasure: z.string().min(1),
  minStockLevel: z.coerce.number().min(0).default(0),
});

export async function POST(req: Request) {
  const { user, response } = await authorize([ROLES.ADMIN]);
  if (!user) return response;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error("Invalid catalog item.");

  const sku = parsed.data.sku.toUpperCase();
  const existing = await prisma.inventoryItem.findUnique({ where: { sku } });
  if (existing) return error("SKU already exists.");

  const item = await prisma.inventoryItem.create({
    data: { ...parsed.data, sku },
  });
  return ok({ item }, { status: 201 });
}
