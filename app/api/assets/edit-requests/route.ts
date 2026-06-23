import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES, EDIT_REQUEST_STATUS, NOTIFICATION_TYPE } from "@/lib/constants";
import { findSiteManagerForSite, notifyUser } from "@/lib/assets";

export async function GET() {
  const { user, response } = await authorize([ROLES.ADMIN, ROLES.SITE_MANAGER]);
  if (!user || !user.companyId) return response ?? ok({ requests: [] });

  const where =
    user.role === ROLES.ADMIN
      ? { asset: { companyId: user.companyId }, requestedById: user.id }
      : { assignedManagerId: user.id, status: EDIT_REQUEST_STATUS.PENDING };

  const requests = await prisma.assetEditRequest.findMany({
    where,
    include: {
      asset: { select: { id: true, assetTagId: true, description: true } },
      requester: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return ok({ requests });
}

const createSchema = z.object({
  assetId: z.string().min(1),
  payload: z.record(z.unknown()),
});

export async function POST(req: Request) {
  const { user, response } = await authorize([ROLES.ADMIN]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error("Invalid edit request.");

  const asset = await prisma.fixedAsset.findFirst({
    where: { id: parsed.data.assetId, companyId: user.companyId, retiredAt: null },
  });
  if (!asset) return error("Asset not found.", 404);

  const manager = await findSiteManagerForSite(asset.jobSiteId, user.companyId);
  if (!manager) return error("No site manager assigned to this asset's job site.");

  const request = await prisma.assetEditRequest.create({
    data: {
      assetId: asset.id,
      requestedById: user.id,
      assignedManagerId: manager.id,
      payload: JSON.stringify(parsed.data.payload),
    },
  });

  await notifyUser(
    manager.id,
    NOTIFICATION_TYPE.EDIT_REQUEST,
    `Edit request: ${asset.assetTagId}`,
    `${user.fullName} requested changes to ${asset.description}.`,
    { requestId: request.id, assetId: asset.id }
  );

  return ok({ request }, { status: 201 });
}
