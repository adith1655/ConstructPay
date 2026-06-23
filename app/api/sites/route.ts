import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";

const createSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
});

export async function GET() {
  const { user, response } = await authorize();
  if (!user) return response;

  if (user.role === ROLES.SUPER_ADMIN) {
    const sites = await prisma.jobSite.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        company: { select: { name: true } },
        costCodes: { select: { id: true, code: true, description: true } },
      },
    });
    return ok({ sites });
  }

  if (!user.companyId) return ok({ sites: [] });

  const where =
    user.role === ROLES.ADMIN
      ? { active: true, companyId: user.companyId }
      : {
          active: true,
          companyId: user.companyId,
          assignments: { some: { userId: user.id } },
        };

  const sites = await prisma.jobSite.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      costCodes: {
        orderBy: { code: "asc" },
        select: { id: true, code: true, description: true },
      },
    },
  });

  return ok({ sites });
}

export async function POST(req: Request) {
  const { user, response } = await authorize([ROLES.ADMIN]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error("Site name is required.");

  const site = await prisma.jobSite.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city || "Mumbai",
      companyId: user.companyId,
    },
  });

  await prisma.project.create({
    data: {
      name: `${parsed.data.name} — Main`,
      companyId: user.companyId,
      jobSiteId: site.id,
    },
  });

  return ok({ site }, { status: 201 });
}
