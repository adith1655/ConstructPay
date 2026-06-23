import { ok, error, authorize } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { user, response } = await authorize();
  if (!user) return response;

  const notifications = await prisma.inAppNotification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok({ notifications });
}

export async function PATCH(req: Request) {
  const { user, response } = await authorize();
  if (!user) return response;

  const body = await req.json().catch(() => null);
  const ids = body?.ids as string[] | undefined;
  if (!ids?.length) return error("No notification ids.");

  await prisma.inAppNotification.updateMany({
    where: { userId: user.id, id: { in: ids } },
    data: { read: true },
  });
  return ok({ read: true });
}
