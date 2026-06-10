import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";

const patchSchema = z.object({
  role: z.enum([ROLES.SITE_MANAGER, ROLES.WORKER]).optional(),
  active: z.boolean().optional(),
  complianceDocsOnFile: z.boolean().optional(),
  hourlyRate: z.coerce.number().min(0).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([ROLES.ADMIN]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return error("Invalid update.");

  if (params.id === user.id && parsed.data.active === false) {
    return error("You cannot deactivate your own account.");
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return error("User not found.", 404);
  if (target.companyId !== user.companyId) {
    return error("You can only manage users in your own company.", 403);
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: parsed.data,
    select: {
      id: true,
      role: true,
      active: true,
      complianceDocsOnFile: true,
      hourlyRate: true,
    },
  });

  return ok({ user: updated });
}
