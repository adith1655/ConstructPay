import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES, MANAGER_ROLES, ASSET_AUDIT_ACTION } from "@/lib/constants";
import { canAccessSite } from "@/lib/site-access";
import { logAssetAudit } from "@/lib/assets";
import { evaluateAssetAlerts } from "@/lib/asset-alerts";

const assetInclude = {
  jobSite: { select: { id: true, name: true } },
  location: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  createdBy: { select: { fullName: true } },
};

const createSchema = z.object({
  jobSiteId: z.string().min(1),
  locationId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  description: z.string().min(1),
  assetTagId: z.string().min(1),
  purchaseDate: z.string().optional().nullable(),
  purchasedFrom: z.string().optional().nullable(),
  cost: z.coerce.number().min(0).default(0),
  brand: z.string().min(1),
  model: z.string().min(1),
  serialNo: z.string().min(1),
  photoUrl: z.string().optional().nullable(),
  sourceBillUrl: z.string().optional().nullable(),
  maintenanceDueDate: z.string().optional().nullable(),
  warrantyExpiryDate: z.string().optional().nullable(),
});

function parseDate(v: string | null | undefined) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  const { user, response } = await authorize([...MANAGER_ROLES, ROLES.WORKER]);
  if (!user) return response;

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const includeRetired = searchParams.get("retired") === "1";

  if (user.role === ROLES.WORKER) {
    const assignments = await prisma.assetAssignment.findMany({
      where: { userId: user.id },
      include: { asset: { include: assetInclude } },
    });
    return ok({ assets: assignments.map((a) => a.asset) });
  }

  if (!user.companyId) return ok({ assets: [] });

  let siteFilter: { jobSiteId?: string; jobSite?: object } = {};
  if (user.role === ROLES.SITE_MANAGER) {
    siteFilter = {
      jobSite: {
        assignments: { some: { userId: user.id } },
        ...(siteId ? { id: siteId } : {}),
      },
    };
  } else if (siteId) {
    siteFilter = { jobSiteId: siteId };
  }

  const assets = await prisma.fixedAsset.findMany({
    where: {
      companyId: user.companyId,
      ...(includeRetired ? {} : { retiredAt: null }),
      ...siteFilter,
    },
    include: assetInclude,
    orderBy: { createdAt: "desc" },
  });

  return ok({ assets, readOnly: user.role === ROLES.ADMIN });
}

export async function POST(req: Request) {
  const { user, response } = await authorize([ROLES.SITE_MANAGER]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error("Invalid asset data.");

  if (!(await canAccessSite(user, parsed.data.jobSiteId))) {
    return error("You do not have access to this job site.", 403);
  }

  const tag = parsed.data.assetTagId.trim();
  const dup = await prisma.fixedAsset.findFirst({
    where: { companyId: user.companyId, assetTagId: tag, retiredAt: null },
  });
  if (dup) return error("Asset Tag ID already exists.");

  const asset = await prisma.fixedAsset.create({
    data: {
      companyId: user.companyId,
      jobSiteId: parsed.data.jobSiteId,
      locationId: parsed.data.locationId || null,
      categoryId: parsed.data.categoryId || null,
      departmentId: parsed.data.departmentId || null,
      description: parsed.data.description,
      assetTagId: tag,
      purchaseDate: parseDate(parsed.data.purchaseDate),
      purchasedFrom: parsed.data.purchasedFrom || null,
      cost: parsed.data.cost,
      brand: parsed.data.brand,
      model: parsed.data.model,
      serialNo: parsed.data.serialNo,
      photoUrl: parsed.data.photoUrl || null,
      sourceBillUrl: parsed.data.sourceBillUrl || null,
      maintenanceDueDate: parseDate(parsed.data.maintenanceDueDate),
      warrantyExpiryDate: parseDate(parsed.data.warrantyExpiryDate),
      lastMovedAt: new Date(),
      createdById: user.id,
    },
    include: assetInclude,
  });

  await logAssetAudit(asset.id, ASSET_AUDIT_ACTION.ADD, { asset }, user.id);
  await evaluateAssetAlerts(asset.id);

  return ok({ asset }, { status: 201 });
}
