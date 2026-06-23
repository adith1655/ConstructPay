import { z } from "zod";
import { ok, error, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize([ROLES.SUPER_ADMIN]);
  if (!user) return response;

  if (params.id === user.id) {
    return error("Use your account settings to change your own password.");
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target || target.role === ROLES.SUPER_ADMIN) {
    return error("User not found.", 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error("Password must be at least 8 characters.");

  await prisma.user.update({
    where: { id: params.id },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  return ok({ reset: true, email: target.email });
}
