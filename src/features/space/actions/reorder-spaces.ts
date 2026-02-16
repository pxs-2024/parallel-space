"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getAuth } from "@/features/auth/queries/get-auth";

/**
 * 校验 spaceIds 均属于当前用户（Schema 无 order 字段，仅做权限校验并 revalidate）。
 */
export async function reorderSpaces(spaceIds: string[]): Promise<{ ok: boolean; error?: string }> {
	try {
		const auth = await getAuth();
		if (!auth?.user?.id) {
			return { ok: false, error: "请先登录" };
		}

		const owned = await prisma.space.findMany({
			where: { id: { in: spaceIds }, userId: auth.user.id },
			select: { id: true },
		});
		const ownedIds = new Set(owned.map((s) => s.id));
		if (ownedIds.size !== spaceIds.length || spaceIds.some((id) => !ownedIds.has(id))) {
			return { ok: false, error: "部分空间不存在或无权修改" };
		}

		const locale = await getLocale();
		revalidatePath(`/${locale}/spaces`);
		return { ok: true };
	} catch (e) {
		console.error("reorderSpaces", e);
		return { ok: false, error: "排序失败" };
	}
}
