import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";

const patchSchema = z.object({
  active: z.boolean().optional(),
  plan: z.enum(["Growth", "Enterprise"]).optional(),
});

// Platform owner: suspend/activate a tenant or change its plan.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([ROLES.SUPER_ADMIN]);
  if (!user) return response;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return error("Invalid update.");

  const company = await prisma.company.findUnique({ where: { id: params.id } });
  if (!company) return error("Company not found.", 404);

  const data: Record<string, unknown> = {};
  if (parsed.data.active !== undefined) data.active = parsed.data.active;
  if (parsed.data.plan) {
    data.plan = parsed.data.plan;
    data.monthlyFee = parsed.data.plan === "Enterprise" ? 49999 : 24999;
  }

  const updated = await prisma.company.update({
    where: { id: params.id },
    data,
    select: { id: true, active: true, plan: true, monthlyFee: true },
  });

  return ok({ company: updated });
}
