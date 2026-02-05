"use server";

import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";

/** 获取某空间下的物品列表（用于空间页抽屉），仅当前用户自己的空间 */
export async function getSpaceAssets(spaceId: string) {
	const auth = await getAuth();
	if (!auth?.user?.id) return null;
	const space = await prisma.space.findFirst({
		where: { id: spaceId, userId: auth.user.id },
		select: {
			name: true,
			assets: {
				where: { isDeleted: false },
				select: {
					id: true,
					name: true,
					description: true,
					x: true,
					y: true,
					width: true,
					height: true,
					kind: true,
					state: true,
					quantity: true,
					unit: true,
					reorderPoint: true,
					consumeIntervalDays: true,
					dueAt: true,
					lastDoneAt: true,
					nextDueAt: true,
					refUrl: true,
					expiresAt: true,
					createdAt: true,
				},
			},
		},
	});
	if (!space) return null;
	return { spaceName: space.name, assets: space.assets };
}
