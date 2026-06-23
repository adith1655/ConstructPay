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
  auditLogs: {
    orderBy: { createdAt: "desc" as const },
    take: 20,
    include: { performer: { select: { fullName: true, role: true } } },
  },
};

const patchSchema = z.object({
  jobSiteId: z.string().optional(),
  locationId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  description: z.string().min(1).optional(),
  assetTagId: z.string().min(1).optional(),
  purchaseDate: z.string().optional().nullable(),
  purchasedFrom: z.string().optional().nullable(),
  cost: z.coerce.number().min(0).optional(),
  brand: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  serialNo: z.string().min(1).optional(),
  photoUrl: z.string().optional().nullable(),
  maintenanceDueDate: z.string().optional().nullable(),
  warrantyExpiryDate: z.string().optional().nullable(),
});

function parseDate(v: string | null | undefined) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function getAssetInScope(id: string, companyId: string) {
  return prisma.fixedAsset.findFirst({ where: { id, companyId } });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([...MANAGER_ROLES, ROLES.WORKER]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const asset = await prisma.fixedAsset.findFirst({
    where: { id: params.id, companyId: user.companyId },
    include: assetInclude,
  });
  if (!asset) return error("Asset not found.", 404);

  if (user.role === ROLES.WORKER) {
    const assigned = await prisma.assetAssignment.findUnique({
      where: { assetId_userId: { assetId: asset.id, userId: user.id } },
    });
    if (!assigned) return error("Forbidden", 403);
  }

  if (user.role === ROLES.SITE_MANAGER && !(await canAccessSite(user, asset.jobSiteId))) {
    return error("Forbidden", 403);
  }

  return ok({ asset, readOnly: user.role === ROLES.ADMIN });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([ROLES.SITE_MANAGER]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const existing = await getAssetInScope(params.id, user.companyId);
  if (!existing) return error("Asset not found.", 404);
  if (existing.retiredAt) return error("Cannot edit a retired asset.");
  if (!(await canAccessSite(user, existing.jobSiteId))) {
    return error("Forbidden", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return error("Invalid update.");

  if (parsed.data.jobSiteId && !(await canAccessSite(user, parsed.data.jobSiteId))) {
    return error("Forbidden", 403);
  }

  const data: Record<string, unknown> = { updatedById: user.id };
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue;
    if (k === "purchaseDate" || k === "maintenanceDueDate" || k === "warrantyExpiryDate") {
      data[k] = parseDate(v as string | null);
    } else if (k === "jobSiteId" && v !== existing.jobSiteId) {
      data.jobSiteId = v;
      data.lastMovedAt = new Date();
    } else {
      data[k] = v;
    }
  }

  const asset = await prisma.fixedAsset.update({
    where: { id: params.id },
    data,
    include: assetInclude,
  });

  await logAssetAudit(asset.id, ASSET_AUDIT_ACTION.UPDATE, { before: existing, after: asset }, user.id);
  await evaluateAssetAlerts(asset.id);

  return ok({ asset });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([ROLES.SITE_MANAGER]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const existing = await getAssetInScope(params.id, user.companyId);
  if (!existing) return error("Asset not found.", 404);
  if (!(await canAccessSite(user, existing.jobSiteId))) {
    return error("Forbidden", 403);
  }

  const asset = await prisma.fixedAsset.update({
    where: { id: params.id },
    data: { retiredAt: new Date(), updatedById: user.id },
  });

  await logAssetAudit(asset.id, ASSET_AUDIT_ACTION.RETIRE, { asset: existing }, user.id);
  return ok({ retired: true });
}
