import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, error, authorize } from "@/lib/api";
import { ROLES } from "@/lib/constants";

const createSchema = z.object({
  fullName: z.string().min(1),
  businessName: z.string().min(1),
  roleRequested: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  city: z.string().optional(),
  employees: z.string().optional(),
  useCase: z.string().optional(),
});

// Public: a business submits a subscription request. Never creates a user/company.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return error("Please complete all required fields with a valid email.");
  }

  const request = await prisma.accessRequest.create({
    data: { ...parsed.data, email: parsed.data.email.toLowerCase() },
  });

  // In production this is where confirmation + platform-owner alert emails fire.
  return ok({ id: request.id, status: request.status }, { status: 201 });
}

// Platform owner only: list subscription requests.
export async function GET() {
  const { user, response } = await authorize([ROLES.SUPER_ADMIN]);
  if (!user) return response;

  const requests = await prisma.accessRequest.findMany({
    orderBy: { createdAt: "desc" },
  });
  return ok({ requests });
}
