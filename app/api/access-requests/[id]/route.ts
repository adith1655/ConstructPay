import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES, REQUEST_STATUS } from "@/lib/constants";
import { hashPassword } from "@/lib/auth";

const patchSchema = z.object({
  action: z.enum(["APPROVE", "DENY"]),
  plan: z.string().optional(),
});

function tempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out + "!9";
}

// Platform owner approves a subscription -> provisions a Company tenant + its Admin.
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([ROLES.SUPER_ADMIN]);
  if (!user) return response;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return error("Invalid action.");

  const request = await prisma.accessRequest.findUnique({
    where: { id: params.id },
  });
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

  // APPROVE -> create the company tenant and its first Admin account.
  const existing = await prisma.user.findUnique({
    where: { email: request.email },
  });
  if (existing) return error("A user with this email already exists.");

  const existingCompany = await prisma.company.findUnique({
    where: { name: request.businessName },
  });
  if (existingCompany) {
    return error("A company with this name already exists.");
  }

  const temp = tempPassword();
  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: request.businessName,
        city: request.city || "Mumbai",
        plan: parsed.data.plan || "Growth",
        monthlyFee: parsed.data.plan === "Enterprise" ? 49999 : 24999,
      },
    });
    await tx.user.create({
      data: {
        email: request.email,
        passwordHash: await hashPassword(temp),
        fullName: request.fullName,
        role: ROLES.ADMIN,
        classification: "PAYROLL",
        companyId: company.id,
        active: true,
      },
    });
    await tx.accessRequest.update({
      where: { id: request.id },
      data: { status: REQUEST_STATUS.APPROVED },
    });
  });

  // Temp password returned to the platform owner for this MVP; production emails it.
  return ok({ status: REQUEST_STATUS.APPROVED, tempPassword: temp });
}
