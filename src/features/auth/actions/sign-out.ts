"use server";

import { deleteSessionCookie } from "@/lib/auth/cookies";
import { invalidateSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getAuth } from "../queries/get-auth";
import { signInPath } from "@/paths";

export const signOut = async () => {
	const auth= await getAuth();
	if (!auth) {
		redirect(signInPath());
	}
	// 使 session 失效 服务器
	await invalidateSession(auth.id);
	// 删除 session cookie 客户端
	await deleteSessionCookie();
	redirect(signInPath());
};
