"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { ActionState, toActionState, fromErrorToActionState } from "@/components/form/utils/to-action-state";
import { spacesPath } from "@/paths";

/** 更新物品名称与描述 */
export async function updateAssetNameDescription(
	spaceId: string,
	assetId: string,
	data: { name?: string; description?: string | null }
): Promise<ActionState> {
	try {
		const asset = await prisma.asset.findFirst({
			where: { id: assetId, spaceId, isDeleted: false },
			select: { id: true },
		});
		if (!asset) {
			return toActionState("ERROR", "物品不存在", undefined);
		}

		const updateData: { name?: string; description?: string | null } = {};
		if (data.name !== undefined) {
			const trimmed = data.name.trim();
			if (!trimmed) return toActionState("ERROR", "名称不能为空", undefined);
			updateData.name = trimmed;
		}
		if (data.description !== undefined) updateData.description = data.description?.trim() || null;

		await prisma.asset.update({
			where: { id: assetId },
			data: updateData,
		});

		const locale = await getLocale();
		revalidatePath(`/${locale}${spacesPath()}`);

		return toActionState("SUCCESS", "已保存", undefined);
	} catch (error) {
		return fromErrorToActionState(error, new FormData());
	}
}
