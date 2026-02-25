"use server";

import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";
import type { AssetWithSpace } from "./get-all-spaces-assets";

const DEFAULT_SPACE_NAME = "我的空间";
const DEFAULT_SPACE_DESCRIPTION = "默认空间";

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
	consumeAmountPerTime: true,
	dueAt: true,
	lastDoneAt: true,
	nextDueAt: true,
	createdAt: true,
	spaceId: true,
} as const;

export type SpaceWithAssets = Awaited<ReturnType<typeof getSpacesWithAssets>>;

/**
 * 一次查询获取当前用户的空间列表及全部物品（用于空间页平面图 + 全局搜索）
 */
export async function getSpacesWithAssets(): Promise<{
	spaces: Awaited<ReturnType<typeof getSpaces>>;
	allAssets: AssetWithSpace[];
}> {
	const auth = await getAuth();
	if (!auth) return { spaces: [], allAssets: [] };

	const userId = auth.user.id;

	let spaces = await prisma.space.findMany({
		where: { userId },
		orderBy: { createdAt: "asc" },
		include: {
			assets: {
				where: { isDeleted: false },
				select: assetSelect,
				orderBy: { createdAt: "desc" },
			},
		},
	});

	if (spaces.length === 0) {
		await prisma.space.create({
			data: {
				name: DEFAULT_SPACE_NAME,
				description: DEFAULT_SPACE_DESCRIPTION,
				userId,
				cells: [],
			},
		});
		spaces = await prisma.space.findMany({
			where: { userId },
			orderBy: { createdAt: "asc" },
			include: {
				assets: {
					where: { isDeleted: false },
					select: assetSelect,
					orderBy: { createdAt: "desc" },
				},
			},
		});
	}

	const spacesOnly = spaces.map(({ assets: _, ...s }) => s);
	const allAssets: AssetWithSpace[] = spaces
		.flatMap((s) => s.assets.map((a) => ({ ...a, spaceName: s.name })))
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

	return { spaces: spacesOnly, allAssets };
}
