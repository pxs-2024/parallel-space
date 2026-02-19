"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { ActionState, toActionState, fromErrorToActionState } from "@/components/form/utils/to-action-state";
import { spacesPath } from "@/paths";

/** 可更新的物品详情字段（单位、补货线、消耗周期、每次消耗、到期时间）。修改后会删除该物品下所有 OPEN 的 Action。 */
export async function updateAssetDetail(
	spaceId: string,
	assetId: string,
	data: {
		quantity?: number | null;
		unit?: string | null;
		reorderPoint?: number | null;
		consumeIntervalDays?: number | null;
		consumeAmountPerTime?: number | null;
		dueAt?: Date | null;
		nextDueAt?: Date | null;
	}
): Promise<ActionState> {
	try {
		const asset = await prisma.asset.findFirst({
			where: { id: assetId, spaceId, isDeleted: false },
			select: { id: true },
		});
		if (!asset) {
			return toActionState("ERROR", "物品不存在", undefined);
		}

		const updateData: Parameters<typeof prisma.asset.update>[0]["data"] = {};
		if (data.quantity !== undefined) updateData.quantity = data.quantity;
		if (data.unit !== undefined) updateData.unit = data.unit?.trim() || null;
		if (data.reorderPoint !== undefined) updateData.reorderPoint = data.reorderPoint;
		if (data.consumeIntervalDays !== undefined) updateData.consumeIntervalDays = data.consumeIntervalDays;
		if (data.consumeAmountPerTime !== undefined) updateData.consumeAmountPerTime = data.consumeAmountPerTime;
		if (data.dueAt !== undefined) updateData.dueAt = data.dueAt;
		if (data.nextDueAt !== undefined) updateData.nextDueAt = data.nextDueAt;

		await prisma.$transaction([
			prisma.asset.update({
				where: { id: assetId },
				data: updateData,
			}),
			prisma.action.deleteMany({
				where: { assetId, status: "OPEN" },
			}),
		]);

		const locale = await getLocale();
		revalidatePath(`/${locale}${spacesPath()}`);

		return toActionState("SUCCESS", "已保存", undefined);
	} catch (error) {
		return fromErrorToActionState(error, new FormData());
	}
}
