import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Server-side authorization guard for route handlers.
 * Returns the authenticated user or a NextResponse error to short-circuit.
 */
export async function authorize(allowedRoles?: string[]) {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, response: error("Unauthorized", 401) };
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { user: null, response: error("Forbidden", 403) };
  }
  return { user, response: null as null };
}
