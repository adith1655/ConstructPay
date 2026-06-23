import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([ROLES.ADMIN]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const site = await prisma.jobSite.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });
  if (!site) return error("Site not found.", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error("Invalid assignment.");

  const target = await prisma.user.findFirst({
    where: {
      id: parsed.data.userId,
      companyId: user.companyId,
      role: { in: [ROLES.SITE_MANAGER, ROLES.WORKER] },
    },
  });
  if (!target) return error("User not found.", 404);

  await prisma.userSite.upsert({
    where: { userId_jobSiteId: { userId: target.id, jobSiteId: site.id } },
    update: {},
    create: { userId: target.id, jobSiteId: site.id },
  });

  return ok({ assigned: true });
}
