import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES, MANAGER_ROLES, BUDGET_AUDIT_ACTION } from "@/lib/constants";
import { canAccessSite } from "@/lib/site-access";

const createSchema = z.object({
  projectId: z.string().min(1),
  jobSiteId: z.string().min(1),
  code: z.string().min(1),
  description: z.string().min(1),
  budgetHours: z.coerce.number().min(0).default(0),
  budgetCost: z.coerce.number().min(0).default(0),
});

export async function GET() {
  const { user, response } = await authorize(MANAGER_ROLES);
  if (!user || !user.companyId) return response ?? ok({ items: [], auditLog: [] });

  const projectWhere =
    user.role === ROLES.ADMIN
      ? { companyId: user.companyId }
      : {
          companyId: user.companyId,
          jobSite: { assignments: { some: { userId: user.id } } },
        };

  const projects = await prisma.project.findMany({
    where: projectWhere,
    include: {
      jobSite: { select: { id: true, name: true, budgetLimit: true } },
      costCodes: { orderBy: { code: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  let siteFilter: { jobSiteId?: { in: string[] } } = {};
  if (user.role === ROLES.SITE_MANAGER) {
    const sites = await prisma.userSite.findMany({
      where: { userId: user.id },
      select: { jobSiteId: true },
    });
    siteFilter = { jobSiteId: { in: sites.map((s) => s.jobSiteId) } };
  }

  const auditLog = await prisma.budgetAuditLog.findMany({
    where: {
      performer: { companyId: user.companyId },
      ...siteFilter,
    },
    include: {
      performer: { select: { fullName: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return ok({ projects, auditLog });
}

export async function POST(req: Request) {
  const { user, response } = await authorize(MANAGER_ROLES);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error("Invalid budget item data.");

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, companyId: user.companyId },
  });
  if (!project) return error("Project not found.", 404);
  if (project.jobSiteId !== parsed.data.jobSiteId) {
    return error("Job site does not match project.");
  }
  if (!(await canAccessSite(user, parsed.data.jobSiteId))) {
    return error("You do not have access to this job site.", 403);
  }

  const costCode = await prisma.costCode.create({
    data: {
      projectId: parsed.data.projectId,
      jobSiteId: parsed.data.jobSiteId,
      code: parsed.data.code,
      description: parsed.data.description,
      budgetHours: parsed.data.budgetHours,
      budgetCost: parsed.data.budgetCost,
    },
  });

  await prisma.budgetAuditLog.create({
    data: {
      costCodeId: costCode.id,
      projectId: parsed.data.projectId,
      jobSiteId: parsed.data.jobSiteId,
      action: BUDGET_AUDIT_ACTION.ADD,
      code: costCode.code,
      description: costCode.description,
      budgetHours: costCode.budgetHours,
      budgetCost: costCode.budgetCost,
      performedBy: user.id,
    },
  });

  return ok({ costCode }, { status: 201 });
}
