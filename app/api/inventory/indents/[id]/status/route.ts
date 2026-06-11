import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES, INDENT_STATUS } from "@/lib/constants";

const patchSchema = z.object({
  status: z.enum([
    INDENT_STATUS.APPROVED,
    INDENT_STATUS.REJECTED,
    INDENT_STATUS.ORDERED,
  ]),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([ROLES.ADMIN]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return error("Invalid status.");

  const indent = await prisma.materialIndent.findFirst({
    where: { id: params.id, jobSite: { companyId: user.companyId } },
  });
  if (!indent) return error("Indent not found.", 404);

  const updated = await prisma.materialIndent.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });

  return ok({ indent: updated });
}
