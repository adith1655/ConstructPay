import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildGoogleAuthUrl, generateOAuthState } from "@/lib/google-oauth";

const STATE_COOKIE = "cp_oauth_state";

export async function GET() {
  try {
    const state = generateOAuthState();
    cookies().set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return NextResponse.redirect(buildGoogleAuthUrl(state));
  } catch {
    return NextResponse.redirect(
      new URL("/login?error=google_not_configured", process.env.NEXTAUTH_URL || "http://localhost:3000")
    );
  }
}
