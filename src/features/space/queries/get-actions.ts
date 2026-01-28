import { prisma } from "@/lib/prisma";

export const getActionsBySpaceId = async (spaceId: string) => {
  const actions = await prisma.action.findMany({
    where: { spaceId },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    include: {
      asset: {
        select: { name: true },
      },
    },
  });
  return actions;
};
