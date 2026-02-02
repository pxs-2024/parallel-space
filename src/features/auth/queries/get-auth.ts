"use server";

import { getCurrentSession } from "@/lib/auth/get-current-session";
import { SessionPublic } from "@/lib/auth/types";
import { cache } from "react";

export const getAuth = cache(async (): Promise<SessionPublic | null> => {
	const session = await getCurrentSession();
	if (!session) return null;
	return session;
}) as unknown as (() => Promise<SessionPublic | null>);
