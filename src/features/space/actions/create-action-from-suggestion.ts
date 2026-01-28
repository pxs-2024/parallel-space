"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getAuth } from "@/features/auth/queries/get-auth";

type CreateParams = {
  spaceId: string;
  assetId: string;
  type: "RESTOCK" | "REMIND";
  dueAt?: Date | null;
};

/** 用户从决策页选择建议后，创建一条 OPEN 状态的行为 */
export async function createActionFromSuggestion(params: CreateParams) {
  const auth = await getAuth();
  if (!auth) return { ok: false, error: "未登录" };

  const { spaceId, assetId, type, dueAt } = params;

  const space = await prisma.space.findFirst({
    where: { id: spaceId, userId: auth.user.id },
  });
  if (!space) return { ok: false, error: "空间不存在或无权操作" };

  const asset = await prisma.asset.findFirst({
    where: { id: assetId, spaceId, isDeleted: false },
  });
  if (!asset) return { ok: false, error: "物品不存在或已被删除" };

  await prisma.action.create({
    data: {
      spaceId,
      assetId,
      type,
      status: "OPEN",
      dueAt: dueAt ?? null,
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/decisions`);

  return { ok: true };
}
