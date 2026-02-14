"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getAuth } from "@/features/auth/queries/get-auth";

/**
 * 仅更新空间名称与描述（平面图编辑信息后，点击完成时调用）
 */
export async function updateSpaceInfoFromFloorPlan(
	spaceId: string,
	name: string,
	description: string
): Promise<{ ok: boolean; error?: string }> {
	try {
		const auth = await getAuth();
		if (!auth?.user?.id) return { ok: false, error: "请先登录" };

		const space = await prisma.space.findFirst({
			where: { id: spaceId, userId: auth.user.id },
		});
		if (!space) return { ok: false, error: "空间不存在或无权修改" };

		await prisma.space.update({
			where: { id: spaceId },
			data: {
				name: name.trim(),
				description: description.trim(),
			},
		});

		const locale = await getLocale();
		revalidatePath(`/${locale}/spaces`);
		return { ok: true };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : "更新失败" };
	}
}
