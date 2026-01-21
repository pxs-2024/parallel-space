// src/lib/auth/cookies.ts
import { cookies } from "next/headers";
import { SESSION_EXPIRES_IN_SECONDS } from "./constants";


export const SESSION_COOKIE_NAME = "session_token";

export async function setSessionCookie(token: string) {
	const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_EXPIRES_IN_SECONDS
  });
}

/**
 * 删除 session cookie
 */
export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getSessionTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}
