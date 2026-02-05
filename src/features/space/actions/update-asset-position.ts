"use server";

import { prisma } from "@/lib/prisma";

/** 单次更新一个物品的位置（保留供单点调用） */
export async function updateAssetPosition(
	spaceId: string,
	assetId: string,
	x: number,
	y: number
) {
	const asset = await prisma.asset.findFirst({
		where: {
			id: assetId,
			spaceId,
			isDeleted: false,
		},
		select: { id: true },
	});
	if (!asset) return;

	await prisma.asset.update({
		where: { id: assetId },
		data: { x, y },
	});
}

export type AssetPositionUpdate = {
	assetId: string;
	x: number;
	y: number;
	width?: number;
	height?: number;
};

/** 批量更新当前空间内物品位置与尺寸，一次请求完成 */
export async function updateAssetPositions(
	spaceId: string,
	updates: AssetPositionUpdate[]
) {
	if (updates.length === 0) return;

	await prisma.$transaction(
		updates.map(({ assetId, x, y, width, height }) =>
			prisma.asset.updateMany({
				where: {
					id: assetId,
					spaceId,
					isDeleted: false,
				},
				data: {
					x,
					y,
					...(width != null && { width }),
					...(height != null && { height }),
				},
			})
		)
	);
}
