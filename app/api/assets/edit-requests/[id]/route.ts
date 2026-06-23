import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES, EDIT_REQUEST_STATUS, ASSET_AUDIT_ACTION } from "@/lib/constants";
import { logAssetAudit } from "@/lib/assets";
import { evaluateAssetAlerts } from "@/lib/asset-alerts";

const patchSchema = z.object({
  action: z.enum(["APPLY", "REJECT"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([ROLES.SITE_MANAGER]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const editReq = await prisma.assetEditRequest.findFirst({
    where: {
      id: params.id,
      assignedManagerId: user.id,
      status: EDIT_REQUEST_STATUS.PENDING,
      asset: { companyId: user.companyId },
    },
    include: { asset: true },
  });
  if (!editReq) return error("Edit request not found.", 404);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return error("Invalid action.");

  if (parsed.data.action === "REJECT") {
    await prisma.assetEditRequest.update({
      where: { id: editReq.id },
      data: { status: EDIT_REQUEST_STATUS.REJECTED, resolvedAt: new Date() },
    });
    return ok({ status: EDIT_REQUEST_STATUS.REJECTED });
  }

  const payload = JSON.parse(editReq.payload) as Record<string, unknown>;
  const allowed = [
    "description",
    "locationId",
    "categoryId",
    "departmentId",
    "cost",
    "brand",
    "model",
    "serialNo",
    "purchasedFrom",
    "maintenanceDueDate",
    "warrantyExpiryDate",
  ];
  const data: Record<string, unknown> = { updatedById: user.id };
  for (const key of allowed) {
    if (payload[key] !== undefined) data[key] = payload[key];
  }

  const asset = await prisma.fixedAsset.update({
    where: { id: editReq.assetId },
    data,
  });

  await logAssetAudit(
    asset.id,
    ASSET_AUDIT_ACTION.UPDATE,
    { viaEditRequest: editReq.id, changes: payload },
    user.id
  );

  await prisma.assetEditRequest.update({
    where: { id: editReq.id },
    data: { status: EDIT_REQUEST_STATUS.APPLIED, resolvedAt: new Date() },
  });

  await evaluateAssetAlerts(asset.id);
  return ok({ status: EDIT_REQUEST_STATUS.APPLIED, asset });
}
