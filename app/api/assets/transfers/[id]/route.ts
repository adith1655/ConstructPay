import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES, TRANSFER_STATUS, NOTIFICATION_TYPE } from "@/lib/constants";
import { applyTransferRequest, transferInclude } from "@/lib/asset-transfers";
import { notifyUser } from "@/lib/assets";

const patchSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "CANCEL"]),
  rejectReason: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([ROLES.ADMIN, ROLES.SITE_MANAGER]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const request = await prisma.assetTransferRequest.findFirst({
    where: { id: params.id, companyId: user.companyId },
    include: transferInclude,
  });
  if (!request) return error("Transfer request not found.", 404);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return error("Invalid action.");

  const { action, rejectReason } = parsed.data;

  if (action === "CANCEL") {
    if (user.role !== ROLES.SITE_MANAGER) {
      return error("Only site managers can cancel their own requests.", 403);
    }
    if (request.requestedById !== user.id) {
      return error("You can only cancel your own transfer requests.", 403);
    }
    if (request.status !== TRANSFER_STATUS.PENDING) {
      return error("Only pending requests can be cancelled.");
    }

    const updated = await prisma.assetTransferRequest.update({
      where: { id: request.id },
      data: { status: TRANSFER_STATUS.CANCELLED },
      include: transferInclude,
    });
    return ok({ request: updated });
  }

  if (user.role !== ROLES.ADMIN) {
    return error("Only company admins can approve or reject transfers.", 403);
  }

  if (request.status !== TRANSFER_STATUS.PENDING) {
    return error("This transfer request has already been processed.");
  }

  if (action === "APPROVE") {
    try {
      await applyTransferRequest(request.id, user.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not apply transfer.";
      return error(msg);
    }

    const updated = await prisma.assetTransferRequest.findUnique({
      where: { id: request.id },
      include: transferInclude,
    });
    return ok({ request: updated });
  }

  const updated = await prisma.assetTransferRequest.update({
    where: { id: request.id },
    data: {
      status: TRANSFER_STATUS.REJECTED,
      reviewedById: user.id,
      reviewedAt: new Date(),
      rejectReason: rejectReason?.trim() || null,
    },
    include: transferInclude,
  });

  await notifyUser(
    request.requestedById,
    NOTIFICATION_TYPE.TRANSFER_REQUEST,
    "Transfer request rejected",
    rejectReason
      ? `Your transfer request was rejected: ${rejectReason}`
      : `Your transfer from ${request.fromJobSite.name} to ${request.toJobSite.name} was rejected.`,
    { requestId: request.id }
  );

  return ok({ request: updated });
}
