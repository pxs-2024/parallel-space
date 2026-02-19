"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getAuth } from "@/features/auth/queries/get-auth";
import { AssetKind } from "@/generated/prisma/client";

/** 采纳 AI 建议：在指定空间创建物品并生成待办（RESTOCK） */
export async function acceptAiSuggestion(params: {
  spaceId: string;
  name: string;
  needQty: number;
  unit?: string | null;
}) {
  const auth = await getAuth();
  if (!auth) return { ok: false, error: "未登录" };

  const { spaceId, name, needQty, unit } = params;
  const space = await prisma.space.findFirst({
    where: { id: spaceId, userId: auth.user.id },
  });
  if (!space) return { ok: false, error: "空间不存在或无权操作" };

  const asset = await prisma.asset.create({
    data: {
      spaceId,
      name: name.trim().slice(0, 191),
      kind: AssetKind.STATIC,
      quantity: 0,
      unit: unit?.trim().slice(0, 50) ?? null,
      reorderPoint: needQty > 0 ? needQty : 1,
    },
  });

  await prisma.action.create({
    data: {
      spaceId,
      assetId: asset.id,
      type: "RESTOCK",
      status: "OPEN",
      dueAt: new Date(), // 新建物品无 lastDoneAt，用需求产生时间
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/todo`);
  return { ok: true };
}

/** 仅加入待办（新增物品类）：不创建 asset，待办里完成时再选空间 */
export async function createNewAssetTodoAction(params: {
  spaceId: string;
  name: string;
  needQty: number;
  unit?: string | null;
}) {
  const auth = await getAuth();
  if (!auth) return { ok: false, error: "未登录" };

  const { spaceId, name, needQty, unit } = params;
  const space = await prisma.space.findFirst({
    where: { id: spaceId, userId: auth.user.id },
  });
  if (!space) return { ok: false, error: "空间不存在或无权操作" };

  await prisma.action.create({
    data: {
      spaceId,
      type: "NEW_ASSET",
      status: "OPEN",
      payload: {
        name: name.trim().slice(0, 191),
        needQty: needQty > 0 ? needQty : 0,
        unit: unit?.trim().slice(0, 50) ?? null,
      },
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/todo`);
  return { ok: true };
}
