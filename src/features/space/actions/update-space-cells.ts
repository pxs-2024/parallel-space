"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getAuth } from "@/features/auth/queries/get-auth";
import { isConnected } from "@/components/floor-plan/utils";

export type CellInput = { x: number; y: number };

/**
 * 仅更新空间在平面图上的格子范围（拖拽移动区域后调用）。
 * 校验新区域必须连通（isConnected）。
 */
export async function updateSpaceCells(
	spaceId: string,
	cells: CellInput[]
): Promise<{ ok: boolean; error?: string }> {
	try {
		const auth = await getAuth();
		if (!auth?.user?.id) return { ok: false, error: "请先登录" };

		const space = await prisma.space.findFirst({
			where: { id: spaceId, userId: auth.user.id },
		});
		if (!space) return { ok: false, error: "空间不存在或无权修改" };

		if (cells.length > 0 && !isConnected(cells)) {
			return { ok: false, error: "空间区域必须连通" };
		}

		await prisma.space.update({
			where: { id: spaceId },
			data: { cells },
		});

		const locale = await getLocale();
		revalidatePath(`/${locale}/spaces`);
		return { ok: true };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : "更新失败" };
	}
}
