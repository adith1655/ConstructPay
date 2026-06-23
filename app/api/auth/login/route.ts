import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { ok, error } from "@/lib/api";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error("Email and password are required.");

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || !user.active) {
    return error("Invalid credentials.", 401);
  }

  if (!user.passwordHash) {
    return error("This account uses Google sign-in. Click Verify through Google.", 401);
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return error("Invalid credentials.", 401);

  await createSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    companyId: user.companyId ?? null,
  });

  return ok({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
  });
}
