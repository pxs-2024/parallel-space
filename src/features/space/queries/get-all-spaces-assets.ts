import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";

const assetSelect = {
	id: true,
	name: true,
	description: true,
	kind: true,
	state: true,
	quantity: true,
	unit: true,
	reorderPoint: true,
	consumeIntervalDays: true,
	dueAt: true,
	lastDoneAt: true,
	nextDueAt: true,
	createdAt: true,
	spaceId: true,
	space: { select: { name: true } },
} as const;

export type AssetWithSpace = Awaited<ReturnType<typeof getAllSpacesAssets>>[number];

/**
 * 获取当前用户全部空间的物品（含空间信息），用于空间列表页的全局搜索
 */
export async function getAllSpacesAssets() {
	const auth = await getAuth();
	if (!auth) return [];

	const rows = await prisma.asset.findMany({
		where: {
			space: { userId: auth.user.id },
			isDeleted: false,
		},
		select: assetSelect,
		orderBy: { createdAt: "desc" },
	});

	return rows.map(({ space, ...rest }) => ({
		...rest,
		spaceName: space.name,
	}));
}
