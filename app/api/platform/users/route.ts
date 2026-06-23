import { ok, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { user, response } = await authorize([ROLES.SUPER_ADMIN]);
  if (!user) return response;

  const users = await prisma.user.findMany({
    where: { role: { not: ROLES.SUPER_ADMIN } },
    orderBy: [{ company: { name: "asc" } }, { fullName: "asc" }],
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      active: true,
      company: { select: { name: true } },
    },
  });

  return ok({ users });
}
