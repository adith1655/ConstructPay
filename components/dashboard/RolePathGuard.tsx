"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ROLES } from "@/lib/constants";
import { canAccessDashboardPath } from "@/lib/super-admin-paths";

export function RolePathGuard({ role }: { role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (role === ROLES.SUPER_ADMIN && !canAccessDashboardPath(role, pathname)) {
      router.replace("/dashboard");
    }
  }, [role, pathname, router]);

  return null;
}
