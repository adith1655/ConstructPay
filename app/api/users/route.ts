import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { hashPassword } from "@/lib/auth";

// Company Admin manages users within their own company only.
export async function GET() {
  const { user, response } = await authorize([ROLES.ADMIN]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const users = await prisma.user.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      classification: true,
      trade: true,
      hourlyRate: true,
      complianceDocsOnFile: true,
      active: true,
      siteAssignments: { include: { jobSite: { select: { name: true } } } },
    },
  });
  return ok({ users });
}

const createSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  // Admins may create managers and workers within their company.
  role: z.enum([ROLES.SITE_MANAGER, ROLES.WORKER]),
  classification: z.enum(["PAYROLL", "CONTRACTOR"]).default("PAYROLL"),
  trade: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).default(0),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const { user, response } = await authorize([ROLES.ADMIN]);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return error("Invalid user data. Password must be at least 8 characters.");
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return error("A user with this email already exists.");

  const created = await prisma.user.create({
    data: {
      email,
      fullName: parsed.data.fullName,
      role: parsed.data.role,
      classification: parsed.data.classification,
      trade: parsed.data.trade,
      hourlyRate: parsed.data.hourlyRate,
      passwordHash: await hashPassword(parsed.data.password),
      companyId: user.companyId,
    },
  });

  return ok({ id: created.id, email: created.email }, { status: 201 });
}
