import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";

export type PendingRestockItem = {
	id: string;
	spaceId: string;
	spaceName: string;
	assetId: string;
	assetName: string;
	assetKind: "CONSUMABLE" | "TEMPORAL";
	dueAt: Date | null;
	createdAt: Date;
	/** 消耗型：当前数量、补货线、单位 */
	quantity: number | null;
	reorderPoint: number | null;
	unit: string | null;
};

/** 新增物品类待办：应购买的物品，完成时选择放在哪个空间 */
export type PendingNewAssetItem = {
	id: string;
	spaceId: string;
	spaceName: string;
	createdAt: Date;
	/** 从 payload 解析 */
	name: string;
	unit: string | null;
	needQty: number;
};

/**
 * 待办页数据：拉取 OPEN 的 RESTOCK（有 asset）和 NEW_ASSET（无 asset），按时间倒序。
 */
export const getTodoPageData = async (
	auth: Awaited<ReturnType<typeof getAuth>>
): Promise<{ pending: PendingRestockItem[]; newAssets: PendingNewAssetItem[] }> => {
	if (!auth) return { pending: [], newAssets: [] };
	const userId = auth.user.id;

	// 顺序查询避免连接池同时占用两个连接导致 timeout
	const restockActions = await prisma.action.findMany({
		where: {
			space: { userId },
			status: "OPEN",
			type: "RESTOCK",
			assetId: { not: null },
		},
		include: {
			space: { select: { name: true } },
			asset: {
				select: {
					name: true,
					kind: true,
					quantity: true,
					reorderPoint: true,
					unit: true,
				},
			},
		},
		orderBy: { createdAt: "desc" },
	});
	const newAssetActions = await prisma.action.findMany({
		where: {
			space: { userId },
			status: "OPEN",
			type: "NEW_ASSET",
		},
		include: {
			space: { select: { name: true } },
		},
		orderBy: { createdAt: "desc" },
	});

	const pending: PendingRestockItem[] = restockActions
		.filter((a) => a.asset && (a.asset.kind === "CONSUMABLE" || a.asset.kind === "TEMPORAL"))
		.map((a) => ({
			id: a.id,
			spaceId: a.spaceId,
			spaceName: a.space.name,
			assetId: a.assetId!,
			assetName: a.asset!.name,
			assetKind: a.asset!.kind as "CONSUMABLE" | "TEMPORAL",
			dueAt: a.dueAt,
			createdAt: a.createdAt,
			quantity: a.asset!.quantity ?? null,
			reorderPoint: a.asset!.reorderPoint ?? null,
			unit: a.asset!.unit ?? null,
		}));

	const newAssets: PendingNewAssetItem[] = newAssetActions.map((a) => {
		const payload = (a.payload as { name?: string; unit?: string | null; needQty?: number } | null) ?? {};
		return {
			id: a.id,
			spaceId: a.spaceId,
			spaceName: a.space.name,
			createdAt: a.createdAt,
			name: typeof payload.name === "string" ? payload.name.trim().slice(0, 191) : "未命名",
			unit: typeof payload.unit === "string" ? payload.unit.trim().slice(0, 50) || null : null,
			needQty: typeof payload.needQty === "number" && payload.needQty >= 0 ? payload.needQty : 0,
		};
	});

	return { pending, newAssets };
};
