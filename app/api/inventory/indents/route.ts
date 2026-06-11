import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { MANAGER_ROLES } from "@/lib/constants";
import { canAccessSite } from "@/lib/site-access";

const indentItemSchema = z.object({
  item_id: z.string().min(1),
  qty: z.coerce.number().positive(),
});

const createSchema = z.object({
  siteId: z.string().min(1),
  items: z.array(indentItemSchema).min(1),
});

export async function GET() {
  const { user, response } = await authorize(MANAGER_ROLES);
  if (!user || !user.companyId) return response ?? ok({ indents: [] });

  const indents = await prisma.materialIndent.findMany({
    where: {
      jobSite: { companyId: user.companyId },
    },
    include: {
      jobSite: { select: { name: true } },
      requester: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return ok({
    indents: indents.map((i) => ({
      ...i,
      items: JSON.parse(i.items) as { item_id: string; qty: number }[],
    })),
  });
}

export async function POST(req: Request) {
  const { user, response } = await authorize(MANAGER_ROLES);
  if (!user || !user.companyId) return response ?? error("No company", 403);

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return error("Invalid indent request.");

  if (!(await canAccessSite(user, parsed.data.siteId))) {
    return error("You do not have access to this job site.", 403);
  }

  const indent = await prisma.materialIndent.create({
    data: {
      jobSiteId: parsed.data.siteId,
      requestedBy: user.id,
      items: JSON.stringify(parsed.data.items),
    },
  });

  return ok({ id: indent.id }, { status: 201 });
}
