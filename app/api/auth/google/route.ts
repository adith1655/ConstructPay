import { NextResponse } from "next/server";
import { buildGoogleAuthUrl, generateOAuthState } from "@/lib/google-oauth";
import { sessionCookieOptions } from "@/lib/auth";

const STATE_COOKIE = "cp_oauth_state";

function appBaseUrl() {
  return (
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    process.env.APP_URL ||
    "http://localhost:3000"
  );
}

export async function GET() {
  try {
    const state = generateOAuthState();
    const response = NextResponse.redirect(buildGoogleAuthUrl(state));
    response.cookies.set(STATE_COOKIE, state, {
      ...sessionCookieOptions(),
      maxAge: 600,
    });
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", appBaseUrl())
    );
  }
}
