import { prisma } from "./prisma";
import {
  ASSET_AUDIT_ACTION,
  NOTIFICATION_TYPE,
  ROLES,
  TRANSFER_STATUS,
} from "./constants";
import { notifyUser, findSiteManagerForSite } from "./assets";

export const transferInclude = {
  fromJobSite: { select: { id: true, name: true } },
  toJobSite: { select: { id: true, name: true } },
  requester: { select: { id: true, fullName: true, email: true } },
  reviewer: { select: { id: true, fullName: true } },
  items: {
    select: {
      id: true,
      assetId: true,
      assetTagId: true,
      description: true,
      cost: true,
    },
  },
};

export async function getManagerSiteIds(userId: string) {
  const rows = await prisma.userSite.findMany({
    where: { userId },
    select: { jobSiteId: true },
  });
  return rows.map((r) => r.jobSiteId);
}

export async function notifyCompanyAdmins(
  companyId: string,
  title: string,
  body: string,
  metadata?: Record<string, unknown>
) {
  const admins = await prisma.user.findMany({
    where: { companyId, role: ROLES.ADMIN, active: true },
    select: { id: true },
  });
  for (const admin of admins) {
    await notifyUser(admin.id, NOTIFICATION_TYPE.TRANSFER_REQUEST, title, body, metadata);
  }
}

export async function applyTransferRequest(
  requestId: string,
  reviewerId: string
) {
  const request = await prisma.assetTransferRequest.findUnique({
    where: { id: requestId },
    include: { items: true, fromJobSite: true, toJobSite: true, requester: true },
  });
  if (!request || request.status !== TRANSFER_STATUS.PENDING) {
    throw new Error("Transfer request not found or already resolved.");
  }

  await prisma.$transaction(async (tx) => {
    for (const item of request.items) {
      const asset = await tx.fixedAsset.findUnique({ where: { id: item.assetId } });
      if (!asset || asset.retiredAt || asset.jobSiteId !== request.fromJobSiteId) {
        throw new Error(`Asset ${item.assetTagId} is no longer at the source site.`);
      }

      await tx.assetAssignment.deleteMany({ where: { assetId: item.assetId } });

      const updated = await tx.fixedAsset.update({
        where: { id: item.assetId },
        data: {
          jobSiteId: request.toJobSiteId,
          locationId: null,
          lastMovedAt: new Date(),
          updatedById: reviewerId,
        },
      });

      await tx.assetAuditLog.create({
        data: {
          assetId: item.assetId,
          action: ASSET_AUDIT_ACTION.TRANSFER,
          changes: JSON.stringify({
            requestId: request.id,
            fromJobSiteId: request.fromJobSiteId,
            toJobSiteId: request.toJobSiteId,
            fromSite: request.fromJobSite.name,
            toSite: request.toJobSite.name,
            before: { jobSiteId: asset.jobSiteId },
            after: { jobSiteId: updated.jobSiteId },
          }),
          performedBy: reviewerId,
        },
      });
    }

    await tx.assetTransferRequest.update({
      where: { id: requestId },
      data: {
        status: TRANSFER_STATUS.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });
  });

  const itemCount = request.items.length;
  const tags = request.items.map((i) => i.assetTagId).join(", ");

  await notifyUser(
    request.requestedById,
    NOTIFICATION_TYPE.TRANSFER_REQUEST,
    `Transfer approved (${itemCount} asset${itemCount > 1 ? "s" : ""})`,
    `${tags} moved from ${request.fromJobSite.name} to ${request.toJobSite.name}.`,
    { requestId }
  );

  const destManager = await findSiteManagerForSite(request.toJobSiteId, request.companyId);
  if (destManager && destManager.id !== request.requestedById) {
    await notifyUser(
      destManager.id,
      NOTIFICATION_TYPE.TRANSFER_REQUEST,
      `Assets incoming to ${request.toJobSite.name}`,
      `${itemCount} asset(s) transferred from ${request.fromJobSite.name}: ${tags}.`,
      { requestId }
    );
  }
}

export async function getSiteDependencyCounts(jobSiteId: string) {
  const [activeAssets, pendingTransfers, openShifts] = await Promise.all([
    prisma.fixedAsset.count({
      where: { jobSiteId, retiredAt: null },
    }),
    prisma.assetTransferRequest.count({
      where: {
        status: TRANSFER_STATUS.PENDING,
        OR: [{ fromJobSiteId: jobSiteId }, { toJobSiteId: jobSiteId }],
      },
    }),
    prisma.timeEntry.count({
      where: { jobSiteId, status: "OPEN", clockOut: null },
    }),
  ]);
  return { activeAssets, pendingTransfers, openShifts };
}

export function buildTransferSummary(
  requests: {
    status: string;
    fromJobSiteId: string;
    toJobSiteId: string;
    items: { cost: number }[];
  }[],
  siteIds: string[],
  siteNames: Map<string, string>
) {
  const summary: Record<
    string,
    {
      siteId: string;
      siteName: string;
      outbound: number;
      inbound: number;
      pendingOutbound: number;
      outboundValue: number;
      inboundValue: number;
    }
  > = {};

  for (const siteId of siteIds) {
    summary[siteId] = {
      siteId,
      siteName: siteNames.get(siteId) ?? siteId,
      outbound: 0,
      inbound: 0,
      pendingOutbound: 0,
      outboundValue: 0,
      inboundValue: 0,
    };
  }

  for (const req of requests) {
    const itemCount = req.items.length;
    const totalCost = req.items.reduce((s, i) => s + i.cost, 0);

    if (summary[req.fromJobSiteId]) {
      if (req.status === TRANSFER_STATUS.APPROVED) {
        summary[req.fromJobSiteId].outbound += itemCount;
        summary[req.fromJobSiteId].outboundValue += totalCost;
      } else if (req.status === TRANSFER_STATUS.PENDING) {
        summary[req.fromJobSiteId].pendingOutbound += itemCount;
      }
    }

    if (summary[req.toJobSiteId] && req.status === TRANSFER_STATUS.APPROVED) {
      summary[req.toJobSiteId].inbound += itemCount;
      summary[req.toJobSiteId].inboundValue += totalCost;
    }
  }

  return Object.values(summary);
}
