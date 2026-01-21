"use server";

import { deleteSessionCookie } from "@/lib/auth/cookies";
import { invalidateSession } from "@/lib/auth/session";
import { redirect } from "@/i18n/navigation";
import { getAuth } from "../queries/get-auth";
import { signInPath } from "@/paths";
import { getLocale } from "next-intl/server";

export const signOut = async () => {
	const auth= await getAuth();
	const locale = await getLocale();
	if (!auth) {
		redirect({ href: signInPath(), locale });
	}
	// 使 session 失效 服务器
	await invalidateSession(auth!.id);
	// 删除 session cookie 客户端
	await deleteSessionCookie();
	redirect({ href: signInPath(), locale });
};
