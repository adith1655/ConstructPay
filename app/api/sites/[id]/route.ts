import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { getSiteDependencyCounts } from "@/lib/asset-transfers";

const patchSchema = z.object({
  active: z.boolean(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([ROLES.ADMIN]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const site = await prisma.jobSite.findFirst({
    where: { id: params.id, companyId: user.companyId },
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      active: true,
      createdAt: true,
    },
  });
  if (!site) return error("Job site not found.", 404);

  const dependencies = await getSiteDependencyCounts(site.id);

  return ok({ site, dependencies });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([ROLES.ADMIN]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const site = await prisma.jobSite.findFirst({
    where: { id: params.id, companyId: user.companyId },
  });
  if (!site) return error("Job site not found.", 404);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return error("Invalid update.");

  if (parsed.data.active === false) {
    const deps = await getSiteDependencyCounts(site.id);
    if (deps.activeAssets > 0) {
      return error(
        `Cannot deactivate: ${deps.activeAssets} active asset(s) on this site. Transfer or retire them first.`
      );
    }
    if (deps.pendingTransfers > 0) {
      return error(
        `Cannot deactivate: ${deps.pendingTransfers} pending asset transfer(s) involve this site.`
      );
    }
    if (deps.openShifts > 0) {
      return error(
        `Cannot deactivate: ${deps.openShifts} worker(s) still clocked in at this site.`
      );
    }
  }

  const updated = await prisma.jobSite.update({
    where: { id: site.id },
    data: { active: parsed.data.active },
    select: { id: true, name: true, active: true },
  });

  return ok({ site: updated });
}
