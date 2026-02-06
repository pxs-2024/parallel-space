"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getAuth } from "@/features/auth/queries/get-auth";

export type SnoozeChoice = "ignore_day" | "ignore_week" | "ignore_month";

const SNOOZE_DAYS: Record<SnoozeChoice, number> = {
  ignore_day: 1,
  ignore_week: 7,
  ignore_month: 30,
};

/** 用户选择“忽略”：将 action 标记为 SKIPPED，并在 Asset 上设置 snoozeUntil、清除 openPromptActionId */
export async function snoozeAction(
  actionId: string,
  choice: SnoozeChoice
): Promise<{ ok: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth) return { ok: false, error: "未登录" };

  const action = await prisma.action.findFirst({
    where: {
      id: actionId,
      space: { userId: auth.user.id },
      status: "OPEN",
      type: { in: ["RESTOCK", "REMIND", "DISCARD"] },
    },
  });
  if (!action) return { ok: false, error: "行为不存在或无权操作" };

  const days = SNOOZE_DAYS[choice];
  const snoozeUntil = new Date();
  snoozeUntil.setDate(snoozeUntil.getDate() + days);

  await prisma.$transaction([
    prisma.action.update({
      where: { id: actionId },
      data: { status: "SKIPPED" },
    }),
    ...(action.assetId
      ? [
          prisma.asset.update({
            where: { id: action.assetId },
            data: { snoozeUntil, openPromptActionId: null },
          }),
        ]
      : []),
  ]);

  const locale = await getLocale();
  revalidatePath(`/${locale}/todo`);

  return { ok: true };
}

/** 批量忽略：将多条 action 标记为 SKIPPED，并更新对应 Asset 的 snoozeUntil、清除 openPromptActionId。默认忽略 1 天。 */
export async function snoozeActions(
  actionIds: string[],
  choice: SnoozeChoice = "ignore_day"
): Promise<{ ok: boolean; count?: number; error?: string }> {
  const auth = await getAuth();
  if (!auth) return { ok: false, error: "未登录" };
  if (!Array.isArray(actionIds) || actionIds.length === 0) {
    return { ok: true, count: 0 };
  }

  const days = SNOOZE_DAYS[choice];
  const snoozeUntil = new Date();
  snoozeUntil.setDate(snoozeUntil.getDate() + days);

  const actions = await prisma.action.findMany({
    where: {
      id: { in: actionIds },
      space: { userId: auth.user.id },
      status: "OPEN",
      type: { in: ["RESTOCK", "REMIND", "DISCARD"] },
    },
    select: { id: true, assetId: true },
  });

  const ids = actions.map((a) => a.id);
  const assetIds = [...new Set(actions.map((a) => a.assetId).filter(Boolean) as string[])];

  await prisma.$transaction([
    prisma.action.updateMany({
      where: { id: { in: ids } },
      data: { status: "SKIPPED" },
    }),
    ...(assetIds.length > 0
      ? [
          prisma.asset.updateMany({
            where: { id: { in: assetIds } },
            data: { snoozeUntil, openPromptActionId: null },
          }),
        ]
      : []),
  ]);

  const locale = await getLocale();
  revalidatePath(`/${locale}/todo`);

  return { ok: true, count: ids.length };
}

/** 用户选择“补充/完成”：RESTOCK 需传入补充数量并更新资产，REMIND 需传入新的到期时间并更新 asset.nextDueAt，DISCARD 仅标记 DONE */
export async function completeAction(
  actionId: string,
  restockAmount?: number,
  nextDueAt?: string
): Promise<{ ok: boolean; error?: string }> {
  const auth = await getAuth();
  if (!auth) return { ok: false, error: "未登录" };

  const action = await prisma.action.findFirst({
    where: {
      id: actionId,
      space: { userId: auth.user.id },
      status: "OPEN",
      type: { in: ["RESTOCK", "REMIND", "DISCARD"] },
    },
    include: {
      asset: {
        select: {
          id: true,
          quantity: true,
          reorderPoint: true,
        },
      },
    },
  });
  if (!action) return { ok: false, error: "行为不存在或无权操作" };

  if (action.type === "RESTOCK" && action.assetId) {
    const amount = restockAmount ?? 0;
    if (typeof amount !== "number" || amount < 0) {
      return { ok: false, error: "请输入有效补充数量" };
    }
    const currentQty = action.asset?.quantity ?? 0;
    await prisma.$transaction([
      prisma.asset.update({
        where: { id: action.assetId },
        data: {
          quantity: currentQty + amount,
          openPromptActionId: null,
          state:
            action.asset?.reorderPoint != null &&
            currentQty + amount <= action.asset.reorderPoint
              ? "PENDING_RESTOCK"
              : "ACTIVE",
        },
      }),
      prisma.action.update({
        where: { id: actionId },
        data: { status: "DONE" },
      }),
    ]);
  } else if (action.type === "DISCARD" && action.assetId) {
    await prisma.$transaction([
      prisma.asset.update({
        where: { id: action.assetId },
        data: { openPromptActionId: null, state: "DISCARDED" },
      }),
      prisma.action.update({
        where: { id: actionId },
        data: { status: "DISCARDED" },
      }),
    ]);
  } else if (action.type === "REMIND" && action.assetId) {
    // REMIND：可选传入新到期时间，更新 asset.nextDueAt 后标记 DONE
    const dueDate = nextDueAt ? new Date(nextDueAt) : null;
    if (!dueDate || Number.isNaN(dueDate.getTime())) {
      return { ok: false, error: "请选择到期时间" };
    }
    await prisma.$transaction([
      prisma.asset.update({
        where: { id: action.assetId },
        data: { nextDueAt: dueDate, openPromptActionId: null },
      }),
      prisma.action.update({
        where: { id: actionId },
        data: { status: "DONE" },
      }),
    ]);
  } else {
    // REMIND 无 asset 等兜底
    await prisma.action.update({
      where: { id: actionId },
      data: { status: "DONE" },
    });
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/todo`);

  return { ok: true };
}
