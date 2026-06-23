import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export default async function SitesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== ROLES.ADMIN) redirect("/dashboard");
  return children;
}
