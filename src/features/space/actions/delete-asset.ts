"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { ActionState, toActionState, fromErrorToActionState } from "@/components/form/utils/to-action-state";
import { spacePath } from "@/paths";

export async function deleteAsset(
	spaceId: string,
	assetId: string
): Promise<ActionState> {
	try {
		// 检查 asset 是否存在且属于该 space
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

		// 软删除：设置 isDeleted 为 true
		await prisma.asset.update({
			where: { id: assetId },
			data: { isDeleted: true },
		});

		// 重新验证页面数据（包含 locale 前缀）
		const locale = await getLocale();
		revalidatePath(`/${locale}${spacePath(spaceId)}`);

		return toActionState("SUCCESS", "物品已删除", undefined);
	} catch (error) {
		return fromErrorToActionState(error, new FormData());
	}
}
