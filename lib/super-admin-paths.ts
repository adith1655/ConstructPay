import { ROLES } from "./constants";

/** Routes Platform Owner may access — subscription ops only, no tenant construction modules. */
export const SUPER_ADMIN_PATHS = [
  "/dashboard",
  "/dashboard/companies",
  "/dashboard/requests",
  "/dashboard/password-reset",
];

export function isSuperAdminPath(pathname: string) {
  return SUPER_ADMIN_PATHS.some(
    (p) => pathname === p || (p !== "/dashboard" && pathname.startsWith(p + "/"))
  );
}

export function canAccessDashboardPath(role: string, pathname: string) {
  if (role !== ROLES.SUPER_ADMIN) return true;
  if (pathname === "/dashboard") return true;
  return SUPER_ADMIN_PATHS.some((p) => p !== "/dashboard" && pathname.startsWith(p));
}
