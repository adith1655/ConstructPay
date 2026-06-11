import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES, MANAGER_ROLES, BUDGET_AUDIT_ACTION } from "@/lib/constants";
import { canAccessSite } from "@/lib/site-access";

const patchSchema = z.object({
  code: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  budgetHours: z.coerce.number().min(0).optional(),
  budgetCost: z.coerce.number().min(0).optional(),
});

async function getCostCodeInScope(id: string, companyId: string) {
  return prisma.costCode.findFirst({
    where: { id, project: { companyId } },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize(MANAGER_ROLES);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const existing = await getCostCodeInScope(params.id, user.companyId);
  if (!existing) return error("Budget item not found.", 404);
  if (!(await canAccessSite(user, existing.jobSiteId))) {
    return error("You do not have access to this job site.", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return error("Invalid update.");

  const costCode = await prisma.costCode.update({
    where: { id: params.id },
    data: parsed.data,
  });

  await prisma.budgetAuditLog.create({
    data: {
      costCodeId: costCode.id,
      projectId: costCode.projectId,
      jobSiteId: costCode.jobSiteId,
      action: BUDGET_AUDIT_ACTION.UPDATE,
      code: costCode.code,
      description: costCode.description,
      budgetHours: costCode.budgetHours,
      budgetCost: costCode.budgetCost,
      performedBy: user.id,
    },
  });

  return ok({ costCode });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([ROLES.ADMIN]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const existing = await getCostCodeInScope(params.id, user.companyId);
  if (!existing) return error("Budget item not found.", 404);

  await prisma.budgetAuditLog.create({
    data: {
      costCodeId: null,
      projectId: existing.projectId,
      jobSiteId: existing.jobSiteId,
      action: BUDGET_AUDIT_ACTION.REMOVE,
      code: existing.code,
      description: existing.description,
      budgetHours: existing.budgetHours,
      budgetCost: existing.budgetCost,
      performedBy: user.id,
    },
  });

  await prisma.costCode.delete({ where: { id: params.id } });
  return ok({ deleted: true });
}
