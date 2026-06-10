import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { TIME_ENTRY_STATUS } from "@/lib/constants";

export async function POST() {
  const { user, response } = await authorize();
  if (!user) return response;

  const open = await prisma.timeEntry.findFirst({
    where: { userId: user.id, clockOut: null },
    orderBy: { clockIn: "desc" },
  });
  if (!open) return error("No open shift to clock out of.", 409);

  const clockOut = new Date();
  const hours =
    Math.round(((clockOut.getTime() - open.clockIn.getTime()) / 3_600_000) * 100) /
    100;

  const entry = await prisma.timeEntry.update({
    where: { id: open.id },
    data: {
      clockOut,
      hours,
      status: TIME_ENTRY_STATUS.PENDING,
    },
  });

  return ok({ entry });
}
