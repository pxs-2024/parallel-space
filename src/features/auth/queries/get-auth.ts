"use server";

import { getCurrentSession } from "@/lib/auth/get-current-session";
import type { SessionPublic } from "@/lib/auth/types";
import { cache } from "react";

async function getAuthImpl(): Promise<SessionPublic | null> {
	const session = await getCurrentSession();
	if (!session) return null;
	return session;
}

export const getAuth = cache(getAuthImpl);
