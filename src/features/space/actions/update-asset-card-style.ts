"use server";

/** Schema 已移除 cardColor/cardOpacity，此 action 保留为空实现以避免调用处报错。 */
export async function updateAssetCardStyle(
	_spaceId: string,
	_assetId: string,
	_data: { cardColor: string | null; cardOpacity: number | null }
) {
	// no-op
}
