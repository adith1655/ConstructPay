import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES, REQUEST_STATUS } from "@/lib/constants";
import { hashPassword } from "@/lib/auth";
import { googleEnabledForNewUser } from "@/lib/oauth-cascade";

const patchSchema = z.object({
  action: z.enum(["APPROVE", "DENY"]),
  plan: z.string().optional(),
});

function tempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out + "!9";
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([ROLES.SUPER_ADMIN]);
  if (!user) return response;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return error("Invalid action.");

  const request = await prisma.accessRequest.findUnique({ where: { id: params.id } });
  if (!request) return error("Request not found.", 404);
  if (request.status !== REQUEST_STATUS.PENDING) {
    return error("This request has already been processed.");
  }

  if (parsed.data.action === "DENY") {
    await prisma.accessRequest.update({
      where: { id: request.id },
      data: { status: REQUEST_STATUS.DENIED },
    });
    return ok({ status: REQUEST_STATUS.DENIED });
  }

  const existing = await prisma.user.findUnique({ where: { email: request.email.toLowerCase() } });
  if (existing) return error("A user with this email already exists.");

  const existingCompany = await prisma.company.findUnique({ where: { name: request.businessName } });
  if (existingCompany) return error("A company with this name already exists.");

  const temp = tempPassword();
  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: request.businessName,
        city: request.city || "Mumbai",
        plan: parsed.data.plan || "Growth",
        monthlyFee: parsed.data.plan === "Enterprise" ? 49999 : 24999,
        status: "APPROVED",
        googleOAuthEnabled: true,
        maxAdminSeats: 2,
      },
    });
    await tx.user.create({
      data: {
        email: request.email.toLowerCase(),
        passwordHash: await hashPassword(temp),
        fullName: request.fullName,
        role: ROLES.ADMIN,
        classification: "PAYROLL",
        companyId: company.id,
        active: true,
        googleOAuthEnabled: true,
      },
    });
    await tx.accessRequest.update({
      where: { id: request.id },
      data: { status: REQUEST_STATUS.APPROVED },
    });
  });

  return ok({
    status: REQUEST_STATUS.APPROVED,
    message: "Company approved. First admin can sign in via Google or the temporary password.",
    tempPassword: temp,
  });
}
