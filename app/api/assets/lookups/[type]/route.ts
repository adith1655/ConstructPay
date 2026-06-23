import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { MANAGER_ROLES, ROLES } from "@/lib/constants";

const LOOKUP_TYPES = ["locations", "categories", "departments"] as const;

async function listLookup(type: string, companyId: string) {
  switch (type) {
    case "locations":
      return prisma.assetLocation.findMany({
        where: { companyId, active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
    case "categories":
      return prisma.assetCategory.findMany({
        where: { companyId, active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
    case "departments":
      return prisma.assetDepartment.findMany({
        where: { companyId, active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
    default:
      return null;
  }
}

async function createLookup(type: string, companyId: string, name: string) {
  switch (type) {
    case "locations": {
      const existing = await prisma.assetLocation.findFirst({ where: { companyId, name } });
      if (existing) return existing;
      return prisma.assetLocation.create({ data: { companyId, name } });
    }
    case "categories": {
      const existing = await prisma.assetCategory.findFirst({ where: { companyId, name } });
      if (existing) return existing;
      return prisma.assetCategory.create({ data: { companyId, name } });
    }
    case "departments": {
      const existing = await prisma.assetDepartment.findFirst({ where: { companyId, name } });
      if (existing) return existing;
      return prisma.assetDepartment.create({ data: { companyId, name } });
    }
    default:
      return null;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { type: string } }
) {
  const { user, response } = await authorize([...MANAGER_ROLES, ROLES.WORKER]);
  if (!user || !user.companyId) return response ?? ok({ items: [] });

  if (!LOOKUP_TYPES.includes(params.type as (typeof LOOKUP_TYPES)[number])) {
    return error("Invalid lookup type.");
  }

  const items = await listLookup(params.type, user.companyId);
  return ok({ items: items ?? [] });
}

const createSchema = z.object({ name: z.string().min(1) });

export async function POST(
  req: Request,
  { params }: { params: { type: string } }
) {
  const { user, response } = await authorize([ROLES.SITE_MANAGER]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  if (!LOOKUP_TYPES.includes(params.type as (typeof LOOKUP_TYPES)[number])) {
    return error("Invalid lookup type.");
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error("Name is required.");

  const item = await createLookup(params.type, user.companyId, parsed.data.name.trim());
  if (!item) return error("Invalid lookup type.");

  return ok({ item: { id: item.id, name: item.name } }, { status: 201 });
}
