import { ok, authorize } from "@/lib/api";
import { MANAGER_ROLES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { user, response } = await authorize(MANAGER_ROLES);
  if (!user || !user.companyId) return response ?? ok({ expenses: [] });

  const expenses = await prisma.expenseRecord.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      jobSite: { select: { name: true } },
      createdBy: { select: { fullName: true } },
    },
  });

  return ok({ expenses });
}
