import { ROLES } from "./constants";

/** Whether this user may sign in via Google OAuth. */
export function canUseGoogleOAuth(user: {
  role: string;
  googleOAuthEnabled: boolean;
  email: string;
}) {
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return user.googleOAuthEnabled;
}

/** googleOAuthEnabled for newly provisioned users. */
export function googleEnabledForNewUser(role: string, companyGoogleEnabled: boolean) {
  if (role === ROLES.SITE_MANAGER || role === ROLES.WORKER) return true;
  if (role === ROLES.ADMIN) return companyGoogleEnabled;
  return false;
}
