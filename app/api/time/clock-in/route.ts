import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { TIME_ENTRY_STATUS } from "@/lib/constants";

const schema = z.object({
  jobSiteId: z.string().min(1),
  costCodeId: z.string().optional().nullable(),
  note: z.string().optional(),
  outsideGeofence: z.boolean().optional(),
});

export async function POST(req: Request) {
  const { user, response } = await authorize();
  if (!user) return response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error("A job site is required to clock in.");

  // Block duplicate open entries.
  const open = await prisma.timeEntry.findFirst({
    where: { userId: user.id, clockOut: null },
  });
  if (open) {
    return error("You already have an open shift. Clock out first.", 409);
  }

  const site = await prisma.jobSite.findUnique({
    where: { id: parsed.data.jobSiteId },
  });
  if (!site) return error("Job site not found.", 404);
  if (!user.companyId || site.companyId !== user.companyId) {
    return error("You cannot clock in to this site.", 403);
  }

  const note = parsed.data.outsideGeofence
    ? `[Outside geofence] ${parsed.data.note ?? ""}`.trim()
    : parsed.data.note;

  const entry = await prisma.timeEntry.create({
    data: {
      userId: user.id,
      jobSiteId: parsed.data.jobSiteId,
      costCodeId: parsed.data.costCodeId || null,
      clockIn: new Date(),
      status: TIME_ENTRY_STATUS.OPEN,
      note,
      flagReason: parsed.data.outsideGeofence ? "Clock-in outside geofence" : null,
    },
  });

  return ok({ entry }, { status: 201 });
}
