import { prisma } from "@/lib/prisma";

/** 待决策数据：待处理行为 + 需补货物品 */
export const getDecisionsBySpaceId = async (spaceId: string) => {
  const [openActions, consumableAssets] = await Promise.all([
    prisma.action.findMany({
      where: { spaceId, status: "OPEN" },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
      include: {
        asset: { select: { name: true } },
      },
    }),
    prisma.asset.findMany({
      where: {
        spaceId,
        isDeleted: false,
        kind: "CONSUMABLE",
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        unit: true,
        reorderPoint: true,
      },
    }),
  ]);

  const lowStockAssets = consumableAssets.filter(
    (a) =>
      a.quantity != null &&
      a.reorderPoint != null &&
      a.quantity <= a.reorderPoint
  );

  return { openActions, lowStockAssets };
};
