"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { ActionState, toActionState, fromErrorToActionState } from "@/components/form/utils/to-action-state";
import { spacesPath } from "@/paths";

/** 硬删除物品并连带删除其关联的 Action（通过 schema 的 onDelete: Cascade） */
export async function deleteAsset(
	spaceId: string,
	assetId: string
): Promise<ActionState> {
	try {
		const asset = await prisma.asset.findUnique({
			where: { id: assetId },
			select: { id: true, spaceId: true },
		});

		if (!asset) {
			return toActionState("ERROR", "物品不存在", undefined);
		}

		if (asset.spaceId !== spaceId) {
			return toActionState("ERROR", "无权删除此物品", undefined);
		}

		await prisma.$transaction([
			// 先解除对「当前未处理提示 Action」的引用，否则删除 Asset 时 cascade 删除 Action 会冲突
			prisma.asset.update({
				where: { id: assetId },
				data: { openPromptActionId: null },
			}),
			// 硬删除物品；Action 表上 assetId 已设置 onDelete: Cascade，会连带删除
			prisma.asset.delete({
				where: { id: assetId },
			}),
		]);

		const locale = await getLocale();
		revalidatePath(`/${locale}${spacesPath()}`);

		return toActionState("SUCCESS", "物品已删除", undefined);
	} catch (error) {
		return fromErrorToActionState(error, new FormData());
	}
}
