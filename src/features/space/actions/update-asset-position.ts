"use server";

import { prisma } from "@/lib/prisma";

/** 更新物品的位置 */
export async function updateAssetPosition(
	spaceId: string,
	assetId: string,
	x: number,
	y: number
) {
	// 检查物品是否存在且属于该空间
	const asset = await prisma.asset.findFirst({
		where: {
			id: assetId,
			spaceId,
			isDeleted: false,
		},
		select: { id: true },
	});
	if (!asset) return;

	// 更新位置
	await prisma.asset.update({
		where: { id: assetId },
		data: { x, y },
	});
}
