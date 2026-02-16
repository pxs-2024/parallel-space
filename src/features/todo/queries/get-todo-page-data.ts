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
	/** 消耗型：当前数量、补货线、单位 */
	quantity: number | null;
	reorderPoint: number | null;
	unit: string | null;
};

/**
 * 待办页数据：仅拉取 OPEN 的 RESTOCK，并区分消耗型/时间型（通过 asset.kind）。
 */
export const getTodoPageData = async (
	auth: Awaited<ReturnType<typeof getAuth>>
): Promise<{ pending: PendingRestockItem[] }> => {
	if (!auth) return { pending: [] };
	const userId = auth.user.id;
	const actions = await prisma.action.findMany({
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
		orderBy: { dueAt: "asc" },
	});
	const pending: PendingRestockItem[] = actions
		.filter((a) => a.asset && (a.asset.kind === "CONSUMABLE" || a.asset.kind === "TEMPORAL"))
		.map((a) => ({
			id: a.id,
			spaceId: a.spaceId,
			spaceName: a.space.name,
			assetId: a.assetId!,
			assetName: a.asset!.name,
			assetKind: a.asset!.kind as "CONSUMABLE" | "TEMPORAL",
			dueAt: a.dueAt,
			quantity: a.asset!.quantity ?? null,
			reorderPoint: a.asset!.reorderPoint ?? null,
			unit: a.asset!.unit ?? null,
		}));
	return { pending };
};
