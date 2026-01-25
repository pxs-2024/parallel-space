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
				},
			},
		},
	});
	return space;
};
