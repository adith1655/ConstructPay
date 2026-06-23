import { ok, authorize } from "@/lib/api";
import { MANAGER_ROLES } from "@/lib/constants";
import { getAlertsForUser } from "@/lib/asset-alerts";

export async function GET() {
  const { user, response } = await authorize(MANAGER_ROLES);
  if (!user) return response;

  const data = await getAlertsForUser(user.id, user.companyId, user.role);
  return ok(data);
}
