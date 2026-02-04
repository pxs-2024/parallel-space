import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";

const HISTORY_PAGE_SIZE = 100;

/**
 * 历史记录：仅包含「自动消耗」与「用户已操作」的 action，不包含仍为 OPEN 的待办。
 * 不展示「待补充」(RESTOCK) 类记录，仅展示自动消耗、提醒、丢弃。
 */
export const getActionsForHistory = async () => {
	const auth = await getAuth();
	if (!auth) return [];

	const actions = await prisma.action.findMany({
		where: {
			space: { userId: auth.user.id },
			OR: [
				{ type: "AUTO_CONSUME" },
				{
					type: { in: ["REMIND", "DISCARD"] },
					status: { not: "OPEN" },
				},
			],
		},
		orderBy: { createdAt: "desc" },
		take: HISTORY_PAGE_SIZE,
		include: {
			space: { select: { name: true } },
			asset: { select: { name: true } },
		},
	});
	return actions;
};
