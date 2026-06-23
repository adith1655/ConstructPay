import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { exchangeCodeForUser } from "@/lib/google-oauth";
import { canUseGoogleOAuth } from "@/lib/oauth-cascade";
import { ROLES } from "@/lib/constants";

const STATE_COOKIE = "cp_oauth_state";

function loginError(msg: string) {
  const base = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(msg)}`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = cookies().get(STATE_COOKIE)?.value;
  cookies().set(STATE_COOKIE, "", { path: "/", maxAge: 0 });

  if (!code || !state || state !== savedState) {
    return loginError("Invalid Google sign-in state. Please try again.");
  }

  let profile: Awaited<ReturnType<typeof exchangeCodeForUser>>;
  try {
    profile = await exchangeCodeForUser(code);
  } catch {
    return loginError("Google sign-in failed. Please try again.");
  }

  if (!profile.email_verified) {
    return loginError("Your Google email is not verified.");
  }

  const email = profile.email.toLowerCase();
  const superAdminEmail = process.env.SUPER_ADMIN_GOOGLE_EMAIL?.toLowerCase();

  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: profile.sub }, { email }] },
  });

  // Bootstrap Super Admin on first Google login with configured email
  if (!user && superAdminEmail && email === superAdminEmail) {
    user = await prisma.user.create({
      data: {
        email,
        fullName: profile.name || "Platform Owner",
        role: ROLES.SUPER_ADMIN,
        googleId: profile.sub,
        googleOAuthEnabled: true,
        active: true,
        companyId: null,
      },
    });
  }

  if (!user) {
    return loginError("No ConstructPay account found for this Google email. Request access first.");
  }

  if (!user.active) {
    return loginError("Your account is inactive. Contact your administrator.");
  }

  if (!canUseGoogleOAuth(user)) {
    return loginError("Google sign-in is not enabled for your account yet.");
  }

  if (user.role === ROLES.SUPER_ADMIN && superAdminEmail && email !== superAdminEmail) {
    return loginError("This Google account is not authorized as Platform Owner.");
  }

  if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: profile.sub },
    });
  }

  await createSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    companyId: user.companyId,
  });

  const base = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${base}/dashboard`);
}
