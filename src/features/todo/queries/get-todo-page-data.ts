import { prisma } from "@/lib/prisma";
import { getAuth } from "@/features/auth/queries/get-auth";

export type PendingConfirmAction = {
  id: string;
  type: "RESTOCK" | "REMIND" | "DISCARD";
  spaceId: string;
  spaceName: string;
  assetId: string;
  assetName: string;
  unit: string | null;
  dueAt: Date | null;
};

/**
 * 待办页数据：仅拉取待确认的 OPEN 项（由定时任务生成），不拉取资产、不计算建议。
 */
export const getTodoPageData = async (
  auth: Awaited<ReturnType<typeof getAuth>>
): Promise<{ pending: PendingConfirmAction[] }> => {
  if (!auth) return { pending: [] };
  const userId = auth.user.id;
  const actions = await prisma.action.findMany({
    where: {
      space: { userId },
      status: "OPEN",
      type: { in: ["RESTOCK", "REMIND", "DISCARD"] },
      assetId: { not: null },
    },
    include: {
      space: { select: { name: true } },
      asset: { select: { name: true, unit: true } },
    },
    orderBy: { dueAt: "asc" },
  });
  const pending: PendingConfirmAction[] = actions
    .filter(
      (a) =>
        a.asset &&
        (a.type === "RESTOCK" || a.type === "REMIND" || a.type === "DISCARD")
    )
    .map((a) => ({
      id: a.id,
      type: a.type as "RESTOCK" | "REMIND" | "DISCARD",
      spaceId: a.spaceId,
      spaceName: a.space.name,
      assetId: a.assetId!,
      assetName: a.asset!.name,
      unit: a.asset!.unit ?? null,
      dueAt: a.dueAt,
    }));
  return { pending };
};
