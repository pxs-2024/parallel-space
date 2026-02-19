"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getAuth } from "@/features/auth/queries/get-auth";

/**
 * 删除空间及其下的所有物品与行动
 */
export async function deleteSpace(
	spaceId: string
): Promise<{ ok: boolean; error?: string }> {
	try {
		const auth = await getAuth();
		if (!auth?.user?.id) {
			return { ok: false, error: "请先登录" };
		}

		const space = await prisma.space.findFirst({
			where: { id: spaceId, userId: auth.user.id },
			select: { id: true },
		});

		if (!space) {
			return { ok: false, error: "空间不存在或无权删除" };
		}

		await prisma.$transaction([
			// 先删空间下的行动与物品
			prisma.action.deleteMany({ where: { spaceId } }),
			prisma.asset.deleteMany({ where: { spaceId } }),
			prisma.space.delete({ where: { id: spaceId } }),
		]);

		const locale = await getLocale();
		revalidatePath(`/${locale}/spaces`);

		return { ok: true };
	} catch (e) {
		return {
			ok: false,
			error: e instanceof Error ? e.message : "删除失败",
		};
	}
}

