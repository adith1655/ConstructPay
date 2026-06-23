import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attachSessionToResponse } from "@/lib/auth";
import { exchangeCodeForUser } from "@/lib/google-oauth";
import { canUseGoogleOAuth } from "@/lib/oauth-cascade";
import { ROLES } from "@/lib/constants";

const STATE_COOKIE = "cp_oauth_state";

function appBaseUrl() {
  return (
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    process.env.APP_URL ||
    "http://localhost:3000"
  );
}

function loginError(msg: string) {
  return NextResponse.redirect(`${appBaseUrl()}/login?error=${encodeURIComponent(msg)}`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = req.headers.get("cookie")?.match(/cp_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || state !== savedState) {
    const res = loginError("Invalid Google sign-in state. Please try again.");
    res.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
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

  const response = NextResponse.redirect(`${appBaseUrl()}/dashboard`);
  response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
  await attachSessionToResponse(response, {
    sub: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    companyId: user.companyId,
  });

  return response;
}
