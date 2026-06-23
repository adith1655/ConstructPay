import { ok, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { user, response } = await authorize([ROLES.ADMIN, ROLES.SITE_MANAGER]);
  if (!user || !user.companyId) return response ?? ok({ tag: "" });

  const prefix = "CP";
  const seq = await prisma.fixedAsset.count({ where: { companyId: user.companyId } });
  const tag = `${prefix}-${String(seq + 1).padStart(5, "0")}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  return ok({ tag });
}
