import { prisma } from "@/lib/prisma";

export const getAssetsAndContainers = async (spaceId: string) => {
	const space = await prisma.space.findUnique({
		where: {
			id: spaceId,
		},
		select: {
			id: true,
			name: true,
			assets: {
				where: {
					isDeleted: false,
				},
				select: {
					id: true,
					name: true,
					description: true,
					x: true,
					y: true,
					width: true,
					height: true,
					cardColor: true,
					cardOpacity: true,
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
	return space;
};
