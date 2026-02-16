"use server";

/** Schema 已移除 x/y/width/height，此 action 保留为空实现以避免调用处报错。 */
export async function updateAssetPosition(
	_spaceId: string,
	_assetId: string,
	_x: number,
	_y: number
) {
	// no-op
}

export type AssetPositionUpdate = {
	assetId: string;
	x: number;
	y: number;
	width?: number;
	height?: number;
};

/** Schema 已移除位置与尺寸字段，此 action 保留为空实现。 */
export async function updateAssetPositions(
	_spaceId: string,
	_updates: AssetPositionUpdate[]
) {
	// no-op
}
