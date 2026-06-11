import { ok, authorize } from "@/lib/api";

export async function GET() {
  const { user, response } = await authorize();
  if (!user) return response!;
  return ok({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    companyId: user.companyId,
  });
}
