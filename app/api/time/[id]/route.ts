import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES, TIME_ENTRY_STATUS } from "@/lib/constants";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT", "FLAG"]),
  reason: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { user, response } = await authorize();
  if (!user) return response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error("Invalid action.");

  const entry = await prisma.timeEntry.findUnique({
    where: { id: params.id },
    include: { jobSite: { include: { assignments: true } } },
  });
  if (!entry) return error("Time entry not found.", 404);

  const sameCompany =
    !!user.companyId && entry.jobSite.companyId === user.companyId;
  const isManagerOfSite =
    (user.role === ROLES.ADMIN && sameCompany) ||
    (user.role === ROLES.SITE_MANAGER &&
      sameCompany &&
      entry.jobSite.assignments.some((a) => a.userId === user.id));
  const isOwner = entry.userId === user.id;

  // Workers may only FLAG (dispute) their own entries.
  if (parsed.data.action === "FLAG" && isOwner) {
    const updated = await prisma.timeEntry.update({
      where: { id: entry.id },
      data: {
        status: TIME_ENTRY_STATUS.FLAGGED,
        flagReason: parsed.data.reason || "Disputed by worker",
      },
    });
    return ok({ entry: updated });
  }

  if (!isManagerOfSite) return error("Forbidden", 403);

  const statusMap = {
    APPROVE: TIME_ENTRY_STATUS.APPROVED,
    REJECT: TIME_ENTRY_STATUS.REJECTED,
    FLAG: TIME_ENTRY_STATUS.FLAGGED,
  } as const;

  const updated = await prisma.timeEntry.update({
    where: { id: entry.id },
    data: {
      status: statusMap[parsed.data.action],
      approvedById: parsed.data.action === "APPROVE" ? user.id : null,
      flagReason:
        parsed.data.action === "FLAG"
          ? parsed.data.reason || "Flagged by manager"
          : entry.flagReason,
    },
  });

  return ok({ entry: updated });
}
