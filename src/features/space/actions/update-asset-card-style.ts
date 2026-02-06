"use server";

import { prisma } from "@/lib/prisma";

/** 更新物品信息卡背景色与透明度 */
export async function updateAssetCardStyle(
	spaceId: string,
	assetId: string,
	data: { cardColor: string | null; cardOpacity: number | null }
) {
	const asset = await prisma.asset.findFirst({
		where: { id: assetId, spaceId, isDeleted: false },
		select: { id: true },
	});
	if (!asset) return;

	const updateData: { cardColor?: string | null; cardOpacity?: number | null } = {};
	if (data.cardColor !== undefined) updateData.cardColor = data.cardColor || null;
	if (data.cardOpacity !== undefined) {
		const o = data.cardOpacity;
		updateData.cardOpacity = o == null ? null : Math.max(0, Math.min(1, Number(o)));
	}

	await prisma.asset.update({
		where: { id: assetId },
		data: updateData,
	});
}
