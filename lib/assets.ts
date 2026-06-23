import { prisma } from "./prisma";
import { ASSET_AUDIT_ACTION } from "./constants";

export function assetSnapshot(asset: Record<string, unknown>) {
  return JSON.stringify(asset);
}

export async function logAssetAudit(
  assetId: string,
  action: string,
  changes: Record<string, unknown>,
  performedBy: string
) {
  await prisma.assetAuditLog.create({
    data: {
      assetId,
      action,
      changes: JSON.stringify(changes),
      performedBy,
    },
  });
}

export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  body: string,
  metadata?: Record<string, unknown>
) {
  await prisma.inAppNotification.create({
    data: {
      userId,
      type,
      title,
      body,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

/** Find a site manager assigned to the asset's job site. */
export async function findSiteManagerForSite(jobSiteId: string, companyId: string) {
  return prisma.user.findFirst({
    where: {
      companyId,
      role: "SITE_MANAGER",
      active: true,
      siteAssignments: { some: { jobSiteId } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export { ASSET_AUDIT_ACTION };
