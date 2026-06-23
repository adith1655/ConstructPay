import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { canAccessSite } from "@/lib/site-access";

const schema = z.object({
  assetId: z.string().min(1),
  userId: z.string().min(1),
});

export async function POST(req: Request) {
  const { user, response } = await authorize([ROLES.SITE_MANAGER]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error("Invalid assignment.");

  const asset = await prisma.fixedAsset.findFirst({
    where: { id: parsed.data.assetId, companyId: user.companyId, retiredAt: null },
  });
  if (!asset) return error("Asset not found.", 404);
  if (!(await canAccessSite(user, asset.jobSiteId))) return error("Forbidden", 403);

  const worker = await prisma.user.findFirst({
    where: { id: parsed.data.userId, companyId: user.companyId, role: ROLES.WORKER },
  });
  if (!worker) return error("Worker not found.", 404);

  const assignment = await prisma.assetAssignment.upsert({
    where: { assetId_userId: { assetId: asset.id, userId: worker.id } },
    update: {},
    create: { assetId: asset.id, userId: worker.id, assignedById: user.id },
  });

  return ok({ assignment }, { status: 201 });
}
