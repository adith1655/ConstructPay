import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { hashPassword } from "@/lib/auth";
import { googleEnabledForNewUser } from "@/lib/oauth-cascade";

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  classification: true,
  trade: true,
  hourlyRate: true,
  complianceDocsOnFile: true,
  active: true,
  googleOAuthEnabled: true,
  siteAssignments: { include: { jobSite: { select: { name: true } } } },
} as const;

export async function GET(req: Request) {
  const { user, response } = await authorize([ROLES.ADMIN, ROLES.SITE_MANAGER]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const { searchParams } = new URL(req.url);
  const roleFilter = searchParams.get("role");

  let roleWhere: { role?: string | { in: string[] } } = {};
  if (user.role === ROLES.SITE_MANAGER) {
    roleWhere = { role: ROLES.WORKER };
  } else if (roleFilter === ROLES.SITE_MANAGER) {
    roleWhere = { role: ROLES.SITE_MANAGER };
  } else if (roleFilter === ROLES.WORKER) {
    roleWhere = { role: ROLES.WORKER };
  } else if (roleFilter === ROLES.ADMIN) {
    roleWhere = { role: ROLES.ADMIN };
  }

  const users = await prisma.user.findMany({
    where: { companyId: user.companyId, ...roleWhere },
    orderBy: { createdAt: "asc" },
    select: userSelect,
  });
  return ok({ users });
}

const createSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum([ROLES.ADMIN, ROLES.SITE_MANAGER, ROLES.WORKER]),
  classification: z.enum(["PAYROLL", "CONTRACTOR"]).default("PAYROLL"),
  trade: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).default(0),
  password: z.string().min(8).optional(),
  jobSiteId: z.string().optional(),
});

export async function POST(req: Request) {
  const { user, response } = await authorize([ROLES.ADMIN, ROLES.SITE_MANAGER]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid user data.");
  }

  if (user.role === ROLES.SITE_MANAGER) {
    if (parsed.data.role !== ROLES.WORKER) {
      return error("Site managers can only provision worker accounts.");
    }
  }

  if (user.role === ROLES.ADMIN && parsed.data.role === ROLES.WORKER) {
    // Admins use site-managers / workers tabs; still allowed
  }

  const company = await prisma.company.findUnique({ where: { id: user.companyId } });
  if (!company) return error("Company not found.", 404);

  if (parsed.data.role === ROLES.ADMIN) {
    if (user.role !== ROLES.ADMIN) {
      return error("Only company admins can add admin seats.");
    }
    const adminCount = await prisma.user.count({
      where: { companyId: user.companyId, role: ROLES.ADMIN, active: true },
    });
    if (adminCount >= company.maxAdminSeats) {
      return error(`This subscription allows a maximum of ${company.maxAdminSeats} company admin seats.`);
    }
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return error("A user with this email already exists.");

  const oauthEnabled = googleEnabledForNewUser(parsed.data.role, company.googleOAuthEnabled);

  const created = await prisma.user.create({
    data: {
      email,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      classification: parsed.data.classification,
      trade: parsed.data.trade,
      hourlyRate: parsed.data.hourlyRate,
      passwordHash: parsed.data.password ? await hashPassword(parsed.data.password) : null,
      companyId: user.companyId,
      googleOAuthEnabled: oauthEnabled,
    },
  });

  if (parsed.data.jobSiteId) {
    const site = await prisma.jobSite.findFirst({
      where: { id: parsed.data.jobSiteId, companyId: user.companyId },
    });
    if (site) {
      await prisma.userSite.create({ data: { userId: created.id, jobSiteId: site.id } });
    }
  } else if (user.role === ROLES.SITE_MANAGER) {
    const managerSites = await prisma.userSite.findMany({
      where: { userId: user.id },
      select: { jobSiteId: true },
    });
    for (const s of managerSites) {
      await prisma.userSite.upsert({
        where: { userId_jobSiteId: { userId: created.id, jobSiteId: s.jobSiteId } },
        update: {},
        create: { userId: created.id, jobSiteId: s.jobSiteId },
      });
    }
  }

  return ok({ id: created.id, email: created.email, googleOAuthEnabled: oauthEnabled }, { status: 201 });
}
