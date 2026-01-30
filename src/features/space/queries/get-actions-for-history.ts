import { prisma } from "@/lib/prisma";

const HISTORY_PAGE_SIZE = 100;

export const getActionsForHistory = async () => {
	const actions = await prisma.action.findMany({
		orderBy: { createdAt: "desc" },
		take: HISTORY_PAGE_SIZE,
		include: {
			space: { select: { name: true } },
			asset: { select: { name: true } },
		},
	});
	return actions;
};
