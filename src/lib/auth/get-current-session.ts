// src/lib/auth/get-current-session.ts
import { getSessionTokenFromCookie } from "./cookies";
import { validateSessionToken } from "./session";

export async function getCurrentSession() {
  const token = await getSessionTokenFromCookie();
  if (!token) return null;
  return await validateSessionToken(token);
}
