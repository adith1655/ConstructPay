import { prisma } from "@/lib/prisma";
import { ok, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";

// Platform owner: list all subscriber companies (tenants) with key metrics.
export async function GET() {
  const { user, response } = await authorize([ROLES.SUPER_ADMIN]);
  if (!user) return response;

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      users: {
        select: { id: true, fullName: true, email: true, role: true, active: true },
      },
      _count: { select: { jobSites: true, projects: true } },
    },
  });

  const result = companies.map((c) => ({
    id: c.id,
    name: c.name,
    city: c.city,
    gstin: c.gstin,
    plan: c.plan,
    monthlyFee: c.monthlyFee,
    active: c.active,
    createdAt: c.createdAt,
    admin: c.users.find((u) => u.role === ROLES.ADMIN) ?? null,
    userCount: c.users.length,
    siteCount: c._count.jobSites,
    projectCount: c._count.projects,
  }));

  return ok({ companies: result });
}
