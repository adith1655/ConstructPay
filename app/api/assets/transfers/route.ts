import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES, TRANSFER_STATUS } from "@/lib/constants";
import { canAccessSite } from "@/lib/site-access";
import {
  applyTransferRequest,
  buildTransferSummary,
  getManagerSiteIds,
  notifyCompanyAdmins,
  transferInclude,
} from "@/lib/asset-transfers";

const createSchema = z.object({
  fromJobSiteId: z.string().min(1),
  toJobSiteId: z.string().min(1),
  reason: z.string().optional(),
  assetIds: z.array(z.string().min(1)).min(1),
});

export async function GET(req: Request) {
  const { user, response } = await authorize([ROLES.ADMIN, ROLES.SITE_MANAGER]);
  if (!user || !user.companyId) return response ?? ok({ requests: [], summary: [] });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get("siteId");
  const direction = searchParams.get("direction") ?? "any";
  const status = searchParams.get("status");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const summaryOnly = searchParams.get("summary") === "1";
  const inbox = searchParams.get("inbox");

  let managerSiteIds: string[] | null = null;
  if (user.role === ROLES.SITE_MANAGER) {
    managerSiteIds = await getManagerSiteIds(user.id);
    if (managerSiteIds.length === 0) return ok({ requests: [], summary: [] });
  }

  const where: Record<string, unknown> = { companyId: user.companyId };

  if (status) where.status = status;

  if (inbox === "admin" && user.role === ROLES.ADMIN) {
    where.status = TRANSFER_STATUS.PENDING;
  } else if (inbox === "mine" && user.role === ROLES.SITE_MANAGER) {
    where.requestedById = user.id;
  }

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) (where.createdAt as Record<string, Date>).gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, Date>).lte = end;
    }
  }

  if (user.role === ROLES.SITE_MANAGER && managerSiteIds) {
    where.OR = [
      { fromJobSiteId: { in: managerSiteIds } },
      { toJobSiteId: { in: managerSiteIds } },
    ];
  }

  if (siteId) {
    const siteFilter =
      direction === "outbound"
        ? { fromJobSiteId: siteId }
        : direction === "inbound"
        ? { toJobSiteId: siteId }
        : { OR: [{ fromJobSiteId: siteId }, { toJobSiteId: siteId }] };
    where.AND = [...((where.AND as unknown[]) ?? []), siteFilter];
  }

  const requests = await prisma.assetTransferRequest.findMany({
    where,
    include: transferInclude,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  if (summaryOnly) {
    const sites = await prisma.jobSite.findMany({
      where: {
        companyId: user.companyId,
        active: true,
        ...(user.role === ROLES.SITE_MANAGER && managerSiteIds
          ? { id: { in: managerSiteIds } }
          : {}),
      },
      select: { id: true, name: true },
    });
    const siteNames = new Map(sites.map((s) => [s.id, s.name]));
    const summary = buildTransferSummary(
      requests,
      sites.map((s) => s.id),
      siteNames
    );
    return ok({ summary });
  }

  return ok({ requests });
}

export async function POST(req: Request) {
  const { user, response } = await authorize([ROLES.SITE_MANAGER]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error("Invalid transfer request.");

  const { fromJobSiteId, toJobSiteId, reason, assetIds } = parsed.data;

  if (fromJobSiteId === toJobSiteId) {
    return error("Source and destination sites must be different.");
  }

  if (!(await canAccessSite(user, fromJobSiteId))) {
    return error("You do not have access to the source site.", 403);
  }

  const destSite = await prisma.jobSite.findFirst({
    where: { id: toJobSiteId, companyId: user.companyId, active: true },
  });
  if (!destSite) return error("Destination site not found or inactive.", 404);

  const uniqueIds = [...new Set(assetIds)];
  const assets = await prisma.fixedAsset.findMany({
    where: {
      id: { in: uniqueIds },
      companyId: user.companyId,
      jobSiteId: fromJobSiteId,
      retiredAt: null,
    },
  });

  if (assets.length !== uniqueIds.length) {
    return error("One or more assets are invalid, retired, or not at the source site.");
  }

  const pendingElsewhere = await prisma.assetTransferItem.findFirst({
    where: {
      assetId: { in: uniqueIds },
      request: { status: TRANSFER_STATUS.PENDING },
    },
    include: { request: true, asset: { select: { assetTagId: true } } },
  });
  if (pendingElsewhere) {
    return error(
      `Asset ${pendingElsewhere.assetTagId} already has a pending transfer request.`
    );
  }

  const request = await prisma.assetTransferRequest.create({
    data: {
      companyId: user.companyId,
      fromJobSiteId,
      toJobSiteId,
      requestedById: user.id,
      reason: reason?.trim() || null,
      items: {
        create: assets.map((a) => ({
          assetId: a.id,
          assetTagId: a.assetTagId,
          description: a.description,
          cost: a.cost,
        })),
      },
    },
    include: transferInclude,
  });

  const fromName = request.fromJobSite.name;
  const toName = request.toJobSite.name;
  const count = request.items.length;

  await notifyCompanyAdmins(
    user.companyId,
    `Asset transfer request (${count})`,
    `${user.fullName} requested transfer of ${count} asset(s) from ${fromName} to ${toName}.`,
    { requestId: request.id }
  );

  return ok({ request }, { status: 201 });
}
