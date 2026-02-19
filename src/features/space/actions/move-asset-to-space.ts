"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { ActionState, toActionState, fromErrorToActionState } from "@/components/form/utils/to-action-state";
import { spacesPath } from "@/paths";

/** 将物品从当前空间移动到目标空间 */
export async function moveAssetToSpace(
	assetId: string,
	fromSpaceId: string,
	toSpaceId: string
): Promise<ActionState> {
	try {
		if (fromSpaceId === toSpaceId) {
			return toActionState("ERROR", "已在当前空间", undefined);
		}

		const asset = await prisma.asset.findUnique({
			where: { id: assetId },
			select: { id: true, spaceId: true },
		});

		if (!asset) {
			return toActionState("ERROR", "物品不存在", undefined);
		}

		if (asset.spaceId !== fromSpaceId) {
			return toActionState("ERROR", "无权移动此物品", undefined);
		}

		const targetSpace = await prisma.space.findUnique({
			where: { id: toSpaceId },
			select: { id: true },
		});
		if (!targetSpace) {
			return toActionState("ERROR", "目标空间不存在", undefined);
		}

		await prisma.asset.update({
			where: { id: assetId },
			data: { spaceId: toSpaceId },
		});

		const locale = await getLocale();
		revalidatePath(`/${locale}${spacesPath()}`);

		return toActionState("SUCCESS", "已移动至目标空间", undefined);
	} catch (error) {
		return fromErrorToActionState(error, new FormData());
	}
}
